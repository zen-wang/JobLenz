import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { TAILOR_PROMPT } from "@/lib/prompts";
import type {
  FitReport,
  JobDetails,
  ResumeProfile,
  TailorResult,
} from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";

interface TailorRequest {
  resume_profile: ResumeProfile;
  job_details: JobDetails;
  fit_report: FitReport;
  user_profile?: UserProfile | null;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: TailorRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume_profile, job_details, fit_report, user_profile } = body;

  if (!resume_profile || !job_details || !fit_report) {
    return NextResponse.json(
      { error: "resume_profile, job_details, and fit_report are required" },
      { status: 400 },
    );
  }

  try {
    // Build skills boundary and resume facts constraints from user profile
    let constraintsSection = "";
    if (user_profile) {
      const sb = user_profile.skills_boundary;
      const rf = user_profile.resume_facts;
      const allSkills = [...sb.programming_languages, ...sb.frameworks, ...sb.tools];
      constraintsSection = `
## Tailoring Constraints (from user profile)
### Skills Boundary — ONLY claim these skills:
${allSkills.join(", ")}

### Preserved Facts — NEVER change these:
- Companies: ${rf.preserved_companies.join(", ") || "none specified"}
- Projects: ${rf.preserved_projects.join(", ") || "none specified"}
- School: ${rf.preserved_school || "none specified"}
- Real Metrics (do NOT inflate): ${rf.real_metrics.join("; ") || "none specified"}
`;
    }

    const userPrompt = `## Candidate Resume Profile
${JSON.stringify(resume_profile, null, 2)}

## Target Job Description
${JSON.stringify(job_details, null, 2)}

## Fit Report (use this to prioritize what to highlight)
Overall Score: ${fit_report.overall_score}%
Skills Match: ${fit_report.skills_match.score}% — ${fit_report.skills_match.reasoning}
Experience Fit: ${fit_report.experience_fit.score}% — ${fit_report.experience_fit.reasoning}
Visa Compatibility: ${fit_report.visa_compatibility.score}% — ${fit_report.visa_compatibility.reasoning}
Domain Relevance: ${fit_report.domain_relevance.score}% — ${fit_report.domain_relevance.reasoning}
${constraintsSection}
Generate the tailored Resumx markdown and changes summary JSON now.`;

    const { data, provider, model, latency_ms } =
      await callLLMJson<TailorResult>({
        systemPrompt: TAILOR_PROMPT,
        userPrompt,
        maxTokens: 16384,
      });

    return NextResponse.json(
      {
        ...data,
        llm_metadata: { provider, model, latency_ms },
      },
      {
        headers: { "X-Latency-Ms": String(Date.now() - start) },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
