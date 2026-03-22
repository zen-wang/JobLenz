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

interface CoverLetterRequest {
  resume_profile: ResumeProfile;
  job_details: JobDetails;
  company_intel: CompanyIntel;
  fit_report: FitReport;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: CoverLetterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume_profile, job_details, company_intel, fit_report } = body;

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

## Company Intelligence

### Company Values (status: ${company_intel?.values?.status ?? "unavailable"})
${company_intel?.values?.data ? JSON.stringify(company_intel.values.data, null, 2) : "DATA UNAVAILABLE"}

### H-1B Data (status: ${company_intel?.h1b?.status ?? "unavailable"})
${company_intel?.h1b?.data ? JSON.stringify(company_intel.h1b.data, null, 2) : "DATA UNAVAILABLE"}

## Fit Report Summary
Overall Score: ${fit_report.overall_score}/10
Strengths: ${fit_report.strengths.map((s) => s.text).join("; ")}
Key Dimensions: ${fit_report.dimensions.map((d) => `${d.name}: ${d.score}/10`).join(", ")}

Generate the cover letter and key points JSON now.`;

    const { data, provider, model, latency_ms } =
      await callLLMJson<CoverLetterResult>({
        systemPrompt: COVER_LETTER_PROMPT,
        userPrompt,
        maxTokens: 2048,
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
