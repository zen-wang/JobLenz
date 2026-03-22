import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { FIT_REPORT_PROMPT } from "@/lib/prompts";
import type {
  CompanyIntel,
  FitReport,
  JobDetails,
  ResumeProfile,
  ScoreResult,
} from "@/lib/types";

interface ScoreRequest {
  enriched_jobs: {
    url: string;
    title: string;
    details: JobDetails | null;
    extraction_status: "success" | "failed";
  }[];
  company_intel: CompanyIntel;
  resume_profile: ResumeProfile;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: ScoreRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { enriched_jobs, company_intel, resume_profile } = body;

  if (!enriched_jobs?.length || !resume_profile) {
    return NextResponse.json(
      { error: "enriched_jobs and resume_profile are required" },
      { status: 400 },
    );
  }

  try {
    // Score each job that has details (skip failed extractions)
    const scorable = enriched_jobs.filter(
      (j) => j.extraction_status === "success" && j.details,
    );

    const scored = await Promise.all(
      scorable.map(async (job) => {
        const userPrompt = buildScoreUserPrompt(
          job.details!,
          company_intel,
          resume_profile,
        );

        const { data, provider, model, latency_ms } =
          await callLLMJson<FitReport>({
            systemPrompt: FIT_REPORT_PROMPT,
            userPrompt,
            maxTokens: 4096,
          });

        return {
          url: job.url,
          title: job.title,
          overall_score: data.overall_score,
          dimensions: data.dimensions,
          strengths: data.strengths,
          concerns: data.concerns,
          next_steps: data.next_steps,
          _llm: { provider, model, latency_ms },
        };
      }),
    );

    // Sort by overall_score descending
    scored.sort((a, b) => b.overall_score - a.overall_score);

    const result: ScoreResult & { llm_metadata: unknown } = {
      scored_jobs: scored.map(({ _llm, ...rest }) => rest),
      llm_metadata: {
        provider: scored[0]?._llm.provider,
        model: scored[0]?._llm.model,
        total_latency_ms: scored.reduce((s, j) => s + j._llm.latency_ms, 0),
        jobs_scored: scored.length,
        jobs_skipped: enriched_jobs.length - scorable.length,
      },
    };

    return NextResponse.json(result, {
      headers: { "X-Latency-Ms": String(Date.now() - start) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function buildScoreUserPrompt(
  jobDetails: JobDetails,
  companyIntel: CompanyIntel,
  resumeProfile: ResumeProfile,
): string {
  return `## Candidate Resume Profile
${JSON.stringify(resumeProfile, null, 2)}

## Job Description
${JSON.stringify(jobDetails, null, 2)}

## Company Intelligence

### H-1B Data (status: ${companyIntel.h1b.status})
${companyIntel.h1b.data ? JSON.stringify(companyIntel.h1b.data, null, 2) : "DATA UNAVAILABLE — agent failed"}

### Company Values (status: ${companyIntel.values.status})
${companyIntel.values.data ? JSON.stringify(companyIntel.values.data, null, 2) : "DATA UNAVAILABLE — agent failed"}

### Salary Data (status: ${companyIntel.salary.status})
${companyIntel.salary.data ? JSON.stringify(companyIntel.salary.data, null, 2) : "DATA UNAVAILABLE — agent failed"}

Generate the fit report JSON now.`;
}
