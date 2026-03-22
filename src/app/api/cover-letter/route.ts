import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { COVER_LETTER_PROMPT } from "@/lib/prompts";
import type {
  CompanyIntel,
  CoverLetterResult,
  FitReport,
  JobDetails,
  ResumeProfile,
} from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";

interface CoverLetterRequest {
  resume_profile: ResumeProfile;
  job_details: JobDetails;
  company_intel?: CompanyIntel | null;
  fit_report: FitReport;
  user_profile?: UserProfile | null;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: CoverLetterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume_profile, job_details, company_intel, fit_report, user_profile } = body;

  if (!resume_profile || !job_details || !fit_report) {
    return NextResponse.json(
      { error: "resume_profile, job_details, and fit_report are required" },
      { status: 400 },
    );
  }

  try {
    // Add visa/sponsorship context from user profile if available
    let profileContext = "";
    if (user_profile) {
      const wa = user_profile.work_authorization;
      if (wa.require_sponsorship) {
        profileContext = `\n## Candidate Work Authorization\nRequires sponsorship: Yes\nPermit type: ${wa.work_permit_type || "not specified"}\nNote: If H-1B data shows the company sponsors, briefly mention willingness to discuss visa process.\n`;
      }
    }

    const userPrompt = `## Candidate Resume Profile
${JSON.stringify(resume_profile, null, 2)}

## Target Job Description
${JSON.stringify(job_details, null, 2)}

## Company Intelligence

### Company Values (status: ${company_intel?.values?.status ?? "unavailable"})
${company_intel?.values?.data ? JSON.stringify(company_intel.values.data, null, 2) : "DATA UNAVAILABLE"}

### H-1B Data (status: ${company_intel?.h1b?.status ?? "unavailable"})
${company_intel?.h1b?.data ? JSON.stringify(company_intel.h1b.data, null, 2) : "DATA UNAVAILABLE"}

## Fit Report Summary
Overall Score: ${fit_report.overall_score}%
Skills Match: ${fit_report.skills_match.score}% — ${fit_report.skills_match.reasoning}
Experience Fit: ${fit_report.experience_fit.score}% — ${fit_report.experience_fit.reasoning}
Visa Compatibility: ${fit_report.visa_compatibility.score}% — ${fit_report.visa_compatibility.reasoning}
Domain Relevance: ${fit_report.domain_relevance.score}% — ${fit_report.domain_relevance.reasoning}
${profileContext}
Generate the cover letter and key points JSON now.`;

    const { data, provider, model, latency_ms } =
      await callLLMJson<CoverLetterResult>({
        systemPrompt: COVER_LETTER_PROMPT,
        userPrompt,
        maxTokens: 4096,
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
