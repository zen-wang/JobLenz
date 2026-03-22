"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ScoreResult,
  EnrichResult,
  ResumeProfile,
  CompanyIntel,
  TailorResult,
  CoverLetterResult,
  JobDetails,
  FitReport as FitReportType,
} from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";
import FitReport from "./FitReport";
import TailorView from "./TailorView";
import CoverLetterView from "./CoverLetterView";

interface JobDashboardProps {
  scoreResult: ScoreResult;
  enrichResult: EnrichResult;
  resumeProfile: ResumeProfile;
  companyIntel: CompanyIntel | null;
  userProfile: UserProfile | null;
  discoveredCount: number;
  onStartOver: () => void;
}

interface CompanyGroup {
  company: string;
  bestScore: number;
  jobs: ScoreResult["scored_jobs"];
}

function scoreBadgeStyle(score: number): { bg: string; color: string } {
  if (score >= 80) return { bg: "rgba(34,197,94,0.15)", color: "var(--accent-green)" };
  if (score >= 60) return { bg: "rgba(249,115,22,0.15)", color: "var(--accent-orange)" };
  return { bg: "rgba(239,68,68,0.15)", color: "var(--accent-red)" };
}

const MAX_JOBS_PER_COMPANY = 3;

export default function JobDashboard({
  scoreResult,
  enrichResult,
  resumeProfile,
  companyIntel,
  userProfile,
  discoveredCount,
  onStartOver,
}: JobDashboardProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(() => new Set());
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [tailorResults, setTailorResults] = useState<Record<string, TailorResult>>({});
  const [coverLetterResults, setCoverLetterResults] = useState<Record<string, CoverLetterResult>>({});
  const [tailorLoading, setTailorLoading] = useState<string | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState<string | null>(null);

  const jobs = scoreResult.scored_jobs;

  // Group by company, limit to MAX_JOBS_PER_COMPANY each, sort by best score
  const companyGroups = useMemo((): CompanyGroup[] => {
    const groupMap = new Map<string, ScoreResult["scored_jobs"]>();
    for (const job of jobs) {
      const company = job.company || "Unknown";
      const list = groupMap.get(company) ?? [];
      if (list.length < MAX_JOBS_PER_COMPANY) {
        list.push(job);
        groupMap.set(company, list);
      }
    }
    const groups: CompanyGroup[] = [...groupMap.entries()].map(([company, groupJobs]) => ({
      company,
      bestScore: Math.max(...groupJobs.map((j) => j.overall_score)),
      jobs: groupJobs.sort((a, b) => b.overall_score - a.overall_score),
    }));
    groups.sort((a, b) => b.bestScore - a.bestScore);
    return groups;
  }, [jobs]);

  // Auto-expand first company
  const effectiveExpanded = useMemo(() => {
    if (expandedCompanies.size > 0) return expandedCompanies;
    const first = companyGroups[0]?.company;
    return first ? new Set([first]) : new Set<string>();
  }, [expandedCompanies, companyGroups]);

  const toggleCompany = useCallback((company: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev.size === 0 && companyGroups[0] ? [companyGroups[0].company] : prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
    setExpandedJob(null);
  }, [companyGroups]);

  const handleTailor = useCallback(
    async (jobUrl: string, jobDetails: JobDetails, fitReport: FitReportType) => {
      if (!resumeProfile || tailorLoading) return;
      setTailorLoading(jobUrl);
      try {
        const res = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_profile: resumeProfile, job_details: jobDetails, fit_report: fitReport, user_profile: userProfile }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data: TailorResult = await res.json();
        setTailorResults((p) => ({ ...p, [jobUrl]: data }));
      } catch { /* silently fail */ }
      finally { setTailorLoading(null); }
    },
    [resumeProfile, tailorLoading, userProfile],
  );

  const handleCoverLetter = useCallback(
    async (jobUrl: string, jobDetails: JobDetails, fitReport: FitReportType) => {
      if (!resumeProfile || coverLetterLoading) return;
      setCoverLetterLoading(jobUrl);
      try {
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_profile: resumeProfile, job_details: jobDetails, company_intel: companyIntel, fit_report: fitReport, user_profile: userProfile }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const data: CoverLetterResult = await res.json();
        setCoverLetterResults((p) => ({ ...p, [jobUrl]: data }));
      } catch { /* silently fail */ }
      finally { setCoverLetterLoading(null); }
    },
    [resumeProfile, companyIntel, coverLetterLoading, userProfile],
  );

  const totalJobs = companyGroups.reduce((s, g) => s + g.jobs.length, 0);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ position: "relative", zIndex: 1 }}>
      <div className="w-full max-w-[680px] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between glass-animate-in">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Results</h1>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {totalJobs} jobs across {companyGroups.length} companies ({discoveredCount} discovered)
            </p>
          </div>
          <button onClick={onStartOver} className="font-label text-[11px] hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
            new search
          </button>
        </div>

        {/* Company groups */}
        <div className="space-y-3">
          {companyGroups.map((group, gi) => {
            const isExpanded = effectiveExpanded.has(group.company);
            const badge = scoreBadgeStyle(group.bestScore);

            return (
              <div
                key={group.company}
                className={`glass-card overflow-hidden ${gi < 3 ? `glass-animate-in-delay-${gi + 1}` : "glass-animate-in"}`}
              >
                {/* Company header — always visible, click to toggle */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer select-none"
                  onClick={() => toggleCompany(group.company)}
                >
                  {/* Best score badge */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {group.bestScore}%
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {group.company}
                      </span>
                      <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                        {group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {group.jobs.map((j) => (
                        <span key={j.url} className="text-[10px] px-1.5 py-0.5 rounded glass-inner truncate max-w-[160px]" style={{ color: "var(--text-muted)" }}>
                          {j.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded: job list */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {group.jobs.map((job) => {
                      const isJobExpanded = expandedJob === job.url;
                      const jobBadge = scoreBadgeStyle(job.overall_score);
                      const details = enrichResult.enriched_jobs.find((e) => e.url === job.url)?.details ?? null;
                      const fitReport: FitReportType = {
                        overall_score: job.overall_score,
                        skills_match: job.skills_match,
                        experience_fit: job.experience_fit,
                        visa_compatibility: job.visa_compatibility,
                        domain_relevance: job.domain_relevance,
                        next_steps: job.next_steps,
                      };

                      return (
                        <div key={job.url} className="glass-inner rounded-xl p-3 space-y-3">
                          {/* Job card header */}
                          <div
                            className="flex gap-3 cursor-pointer"
                            onClick={() => setExpandedJob(isJobExpanded ? null : job.url)}
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0"
                              style={{ background: jobBadge.bg, color: jobBadge.color }}
                            >
                              {job.overall_score}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                {job.title}
                              </div>
                              <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {details?.location && <>{details.location}</>}
                                {details?.salary_range && <> · {details.salary_range}</>}
                              </div>
                              {/* Mini dimension bars */}
                              {!isJobExpanded && (
                                <div className="flex gap-3 mt-1.5">
                                  {[
                                    { label: "Skills", score: job.skills_match.score },
                                    { label: "Exp", score: job.experience_fit.score },
                                    { label: "Visa", score: job.visa_compatibility.score },
                                    { label: "Domain", score: job.domain_relevance.score },
                                  ].map((d) => (
                                    <div key={d.label} className="flex items-center gap-1">
                                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{d.label}</span>
                                      <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                        <div
                                          className="h-full rounded-full"
                                          style={{
                                            width: `${d.score}%`,
                                            background: d.score >= 80 ? "var(--accent-green)" : d.score >= 60 ? "var(--accent-orange)" : "var(--accent-red)",
                                            opacity: 0.7,
                                          }}
                                        />
                                      </div>
                                      <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{d.score}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded: full fit report */}
                          {isJobExpanded && (
                            <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                              <FitReport
                                job={job}
                                onTailor={
                                  details
                                    ? () => handleTailor(job.url, details, fitReport)
                                    : undefined
                                }
                                onCoverLetter={
                                  details
                                    ? () => handleCoverLetter(job.url, details, fitReport)
                                    : undefined
                                }
                                tailorLoading={tailorLoading === job.url}
                                coverLetterLoading={coverLetterLoading === job.url}
                              />
                            </div>
                          )}

                          {/* Tailor result */}
                          {tailorResults[job.url] && (
                            <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                              <TailorView result={tailorResults[job.url]} jobTitle={job.title} />
                            </div>
                          )}

                          {/* Cover letter result */}
                          {coverLetterResults[job.url] && (
                            <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                              <CoverLetterView result={coverLetterResults[job.url]} jobTitle={job.title} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {companyGroups.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>No scored jobs to display.</p>
          </div>
        )}
      </div>
    </div>
  );
}
