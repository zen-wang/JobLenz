"use client";

import { useState, useCallback } from "react";
import type {
  PipelineStage,
  DiscoverResult,
  DiscoverSSEEvent,
  EnrichResult,
  ScoreResult,
  ResumeProfile,
  CompanyIntel,
  TailorResult,
  CoverLetterResult,
  JobDetails,
  FitReport as FitReportType,
} from "@/lib/types";
import CompanyInput from "@/components/CompanyInput";
import PipelineProgress from "@/components/PipelineProgress";
import DiscoverResults from "@/components/DiscoverResults";
import FitReport from "@/components/FitReport";
import CompanyIntelPanel from "@/components/CompanyIntelPanel";
import ObservabilityPanel from "@/components/ObservabilityPanel";
import TailorView from "@/components/TailorView";
import CoverLetterView from "@/components/CoverLetterView";

interface LLMMetadata {
  provider: string;
  model: string;
  total_latency_ms: number;
  jobs_scored: number;
  jobs_skipped: number;
}

export default function Home() {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [companyIntel, setCompanyIntel] = useState<CompanyIntel | null>(null);
  const [llmMetadata, setLlmMetadata] = useState<LLMMetadata | null>(null);

  const [discoverLogs, setDiscoverLogs] = useState<string[]>([]);
  const [selectedJobIdx, setSelectedJobIdx] = useState(0);

  // Tailor & Cover Letter state (per-job, keyed by job URL)
  const [tailorResults, setTailorResults] = useState<Record<string, TailorResult>>({});
  const [coverLetterResults, setCoverLetterResults] = useState<Record<string, CoverLetterResult>>({});
  const [tailorLoading, setTailorLoading] = useState<string | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState<string | null>(null);

  const runPipeline = useCallback(
    async (input: {
      company_url: string;
      role_query: string;
      resume_text: string;
    }) => {
      // Reset
      setError(null);
      setDiscoverResult(null);
      setEnrichResult(null);
      setScoreResult(null);
      setResumeProfile(null);
      setCompanyIntel(null);
      setLlmMetadata(null);
      setSelectedJobIdx(0);
      setDiscoverLogs([]);
      setTailorResults({});
      setCoverLetterResults({});
      setTailorLoading(null);
      setCoverLetterLoading(null);

      try {
        // ─── Stage 1: Discover (SSE) ───
        setStage("discovering");
        const discoverRes = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_url: input.company_url,
            role_query: input.role_query,
          }),
        });

        // Non-streaming error (400 validation)
        if (!discoverRes.ok) {
          const err = await discoverRes.json();
          throw new Error(err.error || "Discovery failed");
        }

        // Parse SSE stream
        const reader = discoverRes.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let buffer = "";
        let discover: DiscoverResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const event: DiscoverSSEEvent = JSON.parse(line.slice(6));

            if (event.type === "progress") {
              setDiscoverLogs((prev) => [...prev, event.message]);
            } else if (event.type === "result") {
              discover = event.data;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }

        if (!discover) throw new Error("Stream ended without result");
        setDiscoverResult(discover);

        // ─── Parse resume in parallel with enrichment ───
        setStage("enriching");

        const [enrichRes, resumeRes] = await Promise.all([
          fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobs: discover.jobs.slice(0, 10).map((j) => ({
                title: j.title,
                url: j.url,
              })),
              company_name: discover.company.name,
              company_domain: discover.company.domain,
              max_jobs: 10,
            }),
          }),
          fetch("/api/parse-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: input.resume_text }),
          }),
        ]);

        if (!enrichRes.ok) {
          const err = await enrichRes.json();
          throw new Error(err.error || "Enrichment failed");
        }
        if (!resumeRes.ok) {
          const err = await resumeRes.json();
          throw new Error(err.error || "Resume parsing failed");
        }

        const enrich: EnrichResult = await enrichRes.json();
        const resumeData = await resumeRes.json();
        setEnrichResult(enrich);
        setResumeProfile(resumeData.resume_profile);
        setCompanyIntel(enrich.company_intel);

        // ─── Stage 3: Score ───
        setStage("scoring");
        const scoreRes = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enriched_jobs: enrich.enriched_jobs,
            company_intel: enrich.company_intel,
            resume_profile: resumeData.resume_profile,
          }),
        });
        if (!scoreRes.ok) {
          const err = await scoreRes.json();
          throw new Error(err.error || "Scoring failed");
        }
        const score: ScoreResult & { llm_metadata?: LLMMetadata } =
          await scoreRes.json();
        setScoreResult(score);
        if (score.llm_metadata) setLlmMetadata(score.llm_metadata);

        setStage("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStage("error");
      }
    },
    [],
  );

  const handleTailor = useCallback(
    async (jobUrl: string, jobTitle: string, jobDetails: JobDetails, fitReport: FitReportType) => {
      if (!resumeProfile || tailorLoading) return;

      setTailorLoading(jobUrl);
      setStage("tailoring");
      setError(null);

      try {
        const res = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_profile: resumeProfile,
            job_details: jobDetails,
            fit_report: fitReport,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Tailoring failed");
        }

        const data: TailorResult = await res.json();
        setTailorResults((prev) => ({ ...prev, [jobUrl]: data }));
        setStage("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStage("complete"); // Don't break the pipeline — stay on complete
      } finally {
        setTailorLoading(null);
      }
    },
    [resumeProfile, tailorLoading],
  );

  const handleCoverLetter = useCallback(
    async (jobUrl: string, jobDetails: JobDetails, fitReport: FitReportType) => {
      if (!resumeProfile || coverLetterLoading) return;

      setCoverLetterLoading(jobUrl);
      setStage("cover_letter");
      setError(null);

      try {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_profile: resumeProfile,
            job_details: jobDetails,
            company_intel: companyIntel,
            fit_report: fitReport,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Cover letter generation failed");
        }

        const data: CoverLetterResult = await res.json();
        setCoverLetterResults((prev) => ({ ...prev, [jobUrl]: data }));
        setStage("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStage("complete");
      } finally {
        setCoverLetterLoading(null);
      }
    },
    [resumeProfile, companyIntel, coverLetterLoading],
  );

  const selectedJob = scoreResult?.scored_jobs[selectedJobIdx];

  // Find the enriched job details for the selected scored job
  const selectedJobDetails = selectedJob
    ? enrichResult?.enriched_jobs.find((j) => j.url === selectedJob.url)?.details ?? null
    : null;

  // Build FitReport object for the selected job
  const selectedFitReport: FitReportType | null = selectedJob
    ? {
        overall_score: selectedJob.overall_score,
        dimensions: selectedJob.dimensions,
        strengths: selectedJob.strengths,
        concerns: selectedJob.concerns,
        next_steps: selectedJob.next_steps,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">JobLenz</h1>
            <p className="text-xs text-gray-500">
              AI-powered job intelligence pipeline
            </p>
          </div>
          {stage !== "idle" && (
            <button
              onClick={() => {
                setStage("idle");
                setError(null);
                setDiscoverResult(null);
                setEnrichResult(null);
                setScoreResult(null);
                setResumeProfile(null);
                setCompanyIntel(null);
                setLlmMetadata(null);
                setDiscoverLogs([]);
                setTailorResults({});
                setCoverLetterResults({});
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Input form */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <CompanyInput
            onSubmit={runPipeline}
            disabled={
              stage !== "idle" && stage !== "complete" && stage !== "error"
            }
          />
        </section>

        {/* Pipeline progress */}
        <PipelineProgress stage={stage} discoverLogs={discoverLogs} />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium">Pipeline error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Results area */}
        {(discoverResult || scoreResult) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content — 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Discover results */}
              {discoverResult && (
                <section className="bg-white rounded-lg border border-gray-200 p-4">
                  <DiscoverResults result={discoverResult} />
                </section>
              )}

              {/* Scored job selector + Fit report */}
              {scoreResult && scoreResult.scored_jobs.length > 0 && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                  {/* Job selector tabs */}
                  {scoreResult.scored_jobs.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {scoreResult.scored_jobs.map((job, idx) => (
                        <button
                          key={job.url}
                          onClick={() => setSelectedJobIdx(idx)}
                          className={`
                            shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                            ${
                              idx === selectedJobIdx
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                        >
                          {job.title.length > 40
                            ? job.title.slice(0, 37) + "..."
                            : job.title}
                          <span className="ml-1.5 opacity-75">
                            {job.overall_score}/10
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedJob && (
                    <FitReport
                      job={selectedJob}
                      onTailor={
                        selectedJobDetails && selectedFitReport
                          ? () =>
                              handleTailor(
                                selectedJob.url,
                                selectedJob.title,
                                selectedJobDetails,
                                selectedFitReport,
                              )
                          : undefined
                      }
                      onCoverLetter={
                        selectedJobDetails && selectedFitReport
                          ? () =>
                              handleCoverLetter(
                                selectedJob.url,
                                selectedJobDetails,
                                selectedFitReport,
                              )
                          : undefined
                      }
                      tailorLoading={tailorLoading === selectedJob.url}
                      coverLetterLoading={coverLetterLoading === selectedJob.url}
                    />
                  )}
                </section>
              )}

              {/* Tailor result */}
              {selectedJob && tailorResults[selectedJob.url] && (
                <section className="bg-white rounded-lg border border-gray-200 p-4">
                  <TailorView
                    result={tailorResults[selectedJob.url]}
                    jobTitle={selectedJob.title}
                  />
                </section>
              )}

              {/* Cover letter result */}
              {selectedJob && coverLetterResults[selectedJob.url] && (
                <section className="bg-white rounded-lg border border-gray-200 p-4">
                  <CoverLetterView
                    result={coverLetterResults[selectedJob.url]}
                  />
                </section>
              )}

              {/* Loading states */}
              {stage === "enriching" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">
                    Enriching job data & parsing resume...
                  </p>
                </div>
              )}
              {stage === "scoring" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">
                    Generating fit reports...
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar — 1 col */}
            <div className="space-y-6">
              {/* Company intel */}
              {companyIntel && (
                <section className="bg-white rounded-lg border border-gray-200 p-4">
                  <CompanyIntelPanel intel={companyIntel} />
                </section>
              )}

              {/* Observability */}
              <section className="bg-white rounded-lg border border-gray-200 p-4">
                <ObservabilityPanel
                  scoutMetadata={discoverResult?.scout_metadata}
                  enrichMetrics={enrichResult?.metrics}
                  llmMetadata={llmMetadata ?? undefined}
                />
              </section>

              {/* Resume profile summary */}
              {resumeProfile && (
                <section className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Parsed Resume
                  </h3>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p className="font-medium text-gray-900">
                      {resumeProfile.name}
                    </p>
                    <p>{resumeProfile.email}</p>
                    {resumeProfile.education.length > 0 && (
                      <p>
                        {resumeProfile.education[0].degree},{" "}
                        {resumeProfile.education[0].institution}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[
                        ...resumeProfile.skills.languages,
                        ...resumeProfile.skills.frameworks.slice(0, 3),
                      ].map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {resumeProfile.visa_status && (
                      <p className="mt-1 text-yellow-700">
                        Visa: {resumeProfile.visa_status}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
