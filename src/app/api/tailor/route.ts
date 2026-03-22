import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { TAILOR_PROMPT } from "@/lib/prompts";
import type {
  FitReport,
  JobDetails,
  ResumeProfile,
  TailorResult,
} from "@/lib/types";

interface TailorRequest {
  resume_profile: ResumeProfile;
  job_details: JobDetails;
  fit_report: FitReport;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: TailorRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume_profile, job_details, fit_report } = body;

  if (!resume_profile || !job_details || !fit_report) {
    return NextResponse.json(
      { error: "resume_profile, job_details, and fit_report are required" },
      { status: 400 },
    );
  }

  try {
    const userPrompt = `## Candidate Resume Profile
${JSON.stringify(resume_profile, null, 2)}

## Target Job Description
${JSON.stringify(job_details, null, 2)}

## Fit Report (use this to prioritize what to highlight)
Overall Score: ${fit_report.overall_score}/10
Strengths: ${fit_report.strengths.map((s) => s.text).join("; ")}
Concerns: ${fit_report.concerns.map((c) => c.text).join("; ")}
Dimensions: ${fit_report.dimensions.map((d) => `${d.name}: ${d.score}/10`).join(", ")}

Generate the tailored Resumx markdown and changes summary JSON now.`;

    const { data, provider, model, latency_ms } =
      await callLLMJson<TailorResult>({
        systemPrompt: TAILOR_PROMPT,
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
