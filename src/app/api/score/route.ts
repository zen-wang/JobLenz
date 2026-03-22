import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { FIT_REPORT_PROMPT } from "@/lib/prompts";
import {
  computeSkillsMatch,
  computeVisaScore,
  computeOverallScore,
} from "@/lib/scoring";
import type {
  AssessmentDimension,
  CompanyIntel,
  JobDetails,
  ResumeProfile,
  ScoreResult,
} from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";

interface ScoreRequest {
  enriched_jobs: {
    url: string;
    title: string;
    details: JobDetails | null;
    extraction_status: "success" | "failed";
  }[];
  company_intel?: CompanyIntel | null;
  resume_profile: ResumeProfile;
  user_profile?: UserProfile | null;
}

interface LLMFitResponse {
  experience_fit: AssessmentDimension;
  domain_relevance: AssessmentDimension;
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

  const { enriched_jobs, company_intel, resume_profile, user_profile } = body;

  if (!enriched_jobs?.length || !resume_profile) {
    return NextResponse.json(
      { error: "enriched_jobs and resume_profile are required" },
      { status: 400 },
    );
  }

  try {
    const scorable = enriched_jobs.filter(
      (j) => j.extraction_status === "success" && j.details,
    );

    const BATCH_SIZE = 3;
    const scored: Awaited<ReturnType<typeof scoreJob>>[] = [];

    for (let i = 0; i < scorable.length; i += BATCH_SIZE) {
      const batch = scorable.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(scoreJob));
      scored.push(...batchResults);
    }

    async function scoreJob(job: (typeof scorable)[number]) {
      // 1. Deterministic: Skills Match
      const skills_match = computeSkillsMatch(
        job.details!,
        resume_profile,
        user_profile,
      );

      // 2. Deterministic: Visa Compatibility (uses both h1bdata.info + MyVisaJobs)
      const visa_compatibility = computeVisaScore(
        company_intel ?? null,
        job.details!,
        resume_profile,
        user_profile,
      );

      // 3. LLM: Experience Fit + Domain Relevance
      const userPrompt = buildScoreUserPrompt(
        job.details!,
        resume_profile,
        company_intel,
      );

      const { data, provider, model, latency_ms } =
        await callLLMJson<LLMFitResponse>({
          systemPrompt: FIT_REPORT_PROMPT,
          userPrompt,
          maxTokens: 4096,
        });

      // 4. Overall score: weighted average
      const overall_score = computeOverallScore(
        skills_match,
        data.experience_fit,
        visa_compatibility,
        data.domain_relevance,
      );

      return {
        url: job.url,
        title: job.title,
        company: job.details!.company,
        overall_score,
        skills_match,
        experience_fit: data.experience_fit,
        visa_compatibility,
        domain_relevance: data.domain_relevance,
        next_steps: data.next_steps,
        _llm: { provider, model, latency_ms },
      };
    }

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
  resumeProfile: ResumeProfile,
  companyIntel?: CompanyIntel | null,
): string {
  const sections = [
    `## Candidate Resume Profile\n${JSON.stringify(resumeProfile, null, 2)}`,
    `## Job Description\n${JSON.stringify(jobDetails, null, 2)}`,
  ];

  if (companyIntel?.values?.data) {
    sections.push(`## Company Info\n${JSON.stringify(companyIntel.values.data, null, 2)}`);
  }

  sections.push(
    "Score Experience Fit and Domain Relevance (0-100 each). Do NOT score Skills Match or Visa.",
  );

  return sections.join("\n\n");
}
