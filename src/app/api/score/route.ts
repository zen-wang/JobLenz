import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { FIT_REPORT_PROMPT } from "@/lib/prompts";
import {
  computeDeterministicScores,
  computeOverallScore,
} from "@/lib/scoring";
import type {
  CompanyIntel,
  FitDimension,
  Evidence,
  MissingRequirements,
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

interface LLMFitResponse {
  dimensions: FitDimension[];
  missing_requirements: MissingRequirements;
  strengths: Evidence[];
  concerns: Evidence[];
  next_steps: string;
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

  if (!enriched_jobs?.length || !resume_profile || !company_intel) {
    return NextResponse.json(
      { error: "enriched_jobs, company_intel, and resume_profile are required" },
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
        // 1. Compute deterministic scores
        const deterministic = computeDeterministicScores(
          job.details!,
          company_intel,
          resume_profile,
        );

        // 2. Call LLM for qualitative dimensions
        const userPrompt = buildScoreUserPrompt(
          job.details!,
          company_intel,
          resume_profile,
        );

        const { data, provider, model, latency_ms } =
          await callLLMJson<LLMFitResponse>({
            systemPrompt: FIT_REPORT_PROMPT,
            userPrompt,
            maxTokens: 8192,
          });

        // 3. Compute overall score from LLM dimensions + deterministic
        const overall_score = computeOverallScore(data.dimensions, deterministic);

        return {
          url: job.url,
          title: job.title,
          overall_score,
          dimensions: data.dimensions,
          strengths: data.strengths,
          concerns: data.concerns,
          next_steps: data.next_steps,
          deterministic,
          missing_requirements: data.missing_requirements,
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
    console.error("[score] Failed:", message);
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

### Company Values (status: ${companyIntel.values.status})
${companyIntel.values.data ? JSON.stringify(companyIntel.values.data, null, 2) : "DATA UNAVAILABLE — agent failed"}

Generate the fit assessment JSON now. Remember: score ONLY Technical Fit, Experience Alignment, and Culture Alignment. Do NOT include overall_score.`;
}
