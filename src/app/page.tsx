"use client";

import { useState, useCallback, useRef } from "react";
import type {
  PipelineStage,
  DiscoverResult,
  DiscoverSSEEvent,
  EnrichResult,
  ScoreResult,
  ResumeProfile,
  CompanyIntel,
  SearchPreferences,
} from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";
import MouseGlow from "@/components/MouseGlow";
import Onboarding from "@/components/Onboarding";
import PipelineView from "@/components/PipelineView";
import JobDashboard from "@/components/JobDashboard";

type AppView = "onboarding" | "pipeline" | "dashboard";

function limitJobsPerCompany(
  jobs: { title: string; url: string; location?: string; company?: string }[],
  perCompany: number,
  total: number,
): typeof jobs {
  const byCompany = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const company = job.company ?? "Unknown";
    const list = byCompany.get(company) ?? [];
    if (list.length < perCompany) {
      list.push(job);
      byCompany.set(company, list);
    }
  }
  return [...byCompany.values()].flat().slice(0, total);
}

export default function Home() {
  const [view, setView] = useState<AppView>("onboarding");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [companyIntel, setCompanyIntel] = useState<CompanyIntel | null>(null);
  const [discoverLogs, setDiscoverLogs] = useState<string[]>([]);
  const [streamingSlots, setStreamingSlots] = useState<{ url: string; company: string }[]>([]);
  const [agentProgress, setAgentProgress] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build a minimal UserProfile from search preferences for scoring
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const resetAll = useCallback(() => {
    setView("onboarding");
    setStage("idle");
    setError(null);
    setDiscoverResult(null);
    setEnrichResult(null);
    setScoreResult(null);
    setResumeProfile(null);
    setCompanyIntel(null);
    setDiscoverLogs([]);
    setStreamingSlots([]);
    setAgentProgress([]);
    setUserProfile(null);
    abortControllerRef.current = null;
  }, []);

  const runPipeline = useCallback(
    async (input: { search_preferences: SearchPreferences; resume_text: string }) => {
      setView("pipeline");
      setStage("discovering");
      setError(null);
      setDiscoverResult(null);
      setEnrichResult(null);
      setScoreResult(null);
      setDiscoverLogs([]);
      setStreamingSlots([]);
      setAgentProgress([]);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      // Build minimal UserProfile from search preferences
      const prefs = input.search_preferences;
      const wa = (prefs.work_authorization ?? "").toLowerCase();
      const needsSponsorship = wa.includes("f-1") || wa.includes("opt") || wa.includes("h-1b") || wa.includes("sponsorship");
      const profile: UserProfile = {
        personal: { full_name: "", preferred_name: "", email: "", phone: "", city: prefs.location?.split(",")[0]?.trim() ?? "", province_state: prefs.location?.split(",")[1]?.trim() ?? "", country: "", postal_code: "", linkedin_url: "", github_url: "", portfolio_url: "", website_url: "" },
        work_authorization: {
          legally_authorized_to_work: !needsSponsorship,
          require_sponsorship: needsSponsorship,
          work_permit_type: prefs.work_authorization ?? "",
        },
        compensation: { salary_expectation: "", salary_currency: "USD", salary_range_min: prefs.salary_min ?? "", salary_range_max: prefs.salary_max ?? "" },
        experience: { years_of_experience_total: prefs.experience_years ?? "", education_level: prefs.education_level ?? "", current_title: "", target_role: prefs.positions[0] ?? "" },
        skills_boundary: { programming_languages: [], frameworks: [], tools: [] },
        resume_facts: { preserved_companies: [], preserved_projects: [], preserved_school: "", real_metrics: [] },
        eeo_voluntary: { gender: "", race_ethnicity: "", veteran_status: "", disability_status: "" },
        availability: { earliest_start_date: "" },
      };
      setUserProfile(profile);

      try {
        // ─── Stage 1: Discover (SSE) ───
        const discoverRes = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search_preferences: prefs }),
          signal,
        });
        if (!discoverRes.ok) throw new Error((await discoverRes.json()).error || "Discovery failed");

        const reader = discoverRes.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let buffer = "";
        let discover: DiscoverResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const event: DiscoverSSEEvent = JSON.parse(line.slice(6));
            if (event.type === "progress") setDiscoverLogs((p) => [...p, event.message]);
            else if (event.type === "result") { discover = event.data; setStreamingSlots([]); }
            else if (event.type === "error") throw new Error(event.message);
            else if (event.type === "streaming_url") {
              setStreamingSlots((prev) => {
                const next = [...prev];
                next[event.slot] = { url: event.url, company: event.company };
                return next;
              });
            }
            else if (event.type === "slot_done") {
              setStreamingSlots((prev) => {
                const next = [...prev];
                delete next[event.slot];
                return next;
              });
            }
            else if (event.type === "agent_progress") setAgentProgress((p) => [...p, event.message]);
          }
        }
        if (!discover) throw new Error("Stream ended without result");
        setDiscoverResult(discover);

        // ─── Stage 2: Enrich + Parse resume ───
        setStage("enriching");
        const [enrichRes, resumeRes] = await Promise.all([
          fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobs: limitJobsPerCompany(discover.jobs, 3, 20).map((j) => ({ title: j.title, url: j.url })), max_jobs: 20, skip_cache: prefs.skip_cache }),
            signal,
          }),
          fetch("/api/parse-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: input.resume_text }),
            signal,
          }),
        ]);
        if (!enrichRes.ok) throw new Error((await enrichRes.json()).error || "Enrichment failed");
        if (!resumeRes.ok) throw new Error((await resumeRes.json()).error || "Resume parsing failed");

        const enrich: EnrichResult = await enrichRes.json();
        const resumeData = await resumeRes.json();
        setEnrichResult(enrich);
        setResumeProfile(resumeData.resume_profile);
        setCompanyIntel(enrich.company_intel);

        // ─── Stage 3: Score ───
        setStage("scoring");
        setDiscoverLogs((p) => [...p, "Scoring fit with Claude..."]);
        const scoreRes = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enriched_jobs: enrich.enriched_jobs, company_intel: enrich.company_intel, resume_profile: resumeData.resume_profile, user_profile: profile }),
          signal,
        });
        if (!scoreRes.ok) throw new Error((await scoreRes.json()).error || "Scoring failed");
        const score: ScoreResult = await scoreRes.json();
        setScoreResult(score);
        setDiscoverLogs((p) => [...p, `Done — ${score.scored_jobs.length} jobs scored`]);
        setStage("complete");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setDiscoverLogs((p) => [...p, "Pipeline stopped by user"]);
          setStreamingSlots([]);
          setStage("stopped");
          return;
        }
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setDiscoverLogs((p) => [...p, `Error: ${msg}`]);
        setStage("error");
      }
    },
    [],
  );

  const stopPipeline = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const discoveredCount = discoverResult?.jobs.length ?? 0;
  const enrichedCount = enrichResult?.enriched_jobs.filter((j) => j.extraction_status === "success").length ?? 0;
  const scoredCount = scoreResult?.scored_jobs.length ?? 0;
  const discoverSteps = discoverResult?.scout_metadata.scout_steps ?? 0;
  const enrichSteps = enrichResult?.metrics.tinyfish_steps_total ?? 0;
  const stepsUsed = discoverSteps + enrichSteps;

  return (
    <div className="min-h-screen relative">
      <MouseGlow />

      {view === "onboarding" && (
        <Onboarding onStart={runPipeline} />
      )}

      {view === "pipeline" && (
        <PipelineView
          stage={stage}
          logs={discoverLogs}
          discoveredCount={discoveredCount}
          enrichedCount={enrichedCount}
          scoredCount={scoredCount}
          stepsUsed={stepsUsed}
          streamingSlots={streamingSlots.length > 0 ? streamingSlots : undefined}
          agentProgress={agentProgress.length > 0 ? agentProgress : undefined}
          onStop={stopPipeline}
          onRetry={resetAll}
          onViewResults={
            stage === "complete" && scoreResult
              ? () => setView("dashboard")
              : undefined
          }
        />
      )}

      {view === "dashboard" && scoreResult && enrichResult && resumeProfile && (
        <JobDashboard
          scoreResult={scoreResult}
          enrichResult={enrichResult}
          resumeProfile={resumeProfile}
          companyIntel={companyIntel}
          userProfile={userProfile}
          discoveredCount={discoveredCount}
          onStartOver={resetAll}
        />
      )}

      {/* Error overlay for pipeline view */}
      {view === "pipeline" && error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card px-6 py-3" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
          <p className="text-[12px]" style={{ color: "var(--accent-red)" }}>{error}</p>
        </div>
      )}
    </div>
  );
}
