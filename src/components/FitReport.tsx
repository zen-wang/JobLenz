"use client";

import type {
  FitDimension,
  Evidence,
  DeterministicScores,
  MissingRequirements,
} from "@/lib/types";
import DimensionCard from "./DimensionCard";

interface FitReportProps {
  job: {
    url: string;
    title: string;
    overall_score: number;
    dimensions: FitDimension[];
    strengths: Evidence[];
    concerns: Evidence[];
    next_steps: string;
    deterministic?: DeterministicScores;
    missing_requirements?: MissingRequirements;
  };
  onTailor?: () => void;
  onCoverLetter?: () => void;
  tailorLoading?: boolean;
  coverLetterLoading?: boolean;
}

function overallScoreColor(score: number): string {
  if (score >= 7) return "text-green-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
}

function StatusBadge({
  label,
  status,
  variant,
}: {
  label: string;
  status: string;
  variant: "green" | "yellow" | "gray" | "red" | "blue";
}) {
  const colors = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-700",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}
      >
        {status}
      </span>
    </div>
  );
}

function visaBadgeVariant(
  status: string,
): "green" | "yellow" | "gray" {
  if (status === "sponsor_confirmed" || status === "not_needed") return "green";
  if (status === "sponsor_likely") return "yellow";
  return "gray";
}

function visaLabel(status: string): string {
  switch (status) {
    case "sponsor_confirmed": return "Sponsor Confirmed";
    case "sponsor_likely": return "Sponsor Likely";
    case "not_needed": return "Not Needed";
    default: return "Unknown";
  }
}

function compBadgeVariant(
  status: string,
): "green" | "yellow" | "gray" | "red" {
  if (status === "above_market") return "green";
  if (status === "competitive") return "green";
  if (status === "below_market") return "yellow";
  return "gray";
}

function locationBadgeVariant(
  status: string,
): "green" | "blue" | "yellow" | "gray" {
  if (status === "match") return "green";
  if (status === "remote") return "blue";
  if (status === "partial") return "yellow";
  return "gray";
}

function eduBadgeVariant(
  status: string,
): "green" | "yellow" | "red" | "gray" {
  if (status === "exceeds") return "green";
  if (status === "meets") return "green";
  if (status === "below") return "red";
  return "gray";
}

export default function FitReport({
  job,
  onTailor,
  onCoverLetter,
  tailorLoading,
  coverLetterLoading,
}: FitReportProps) {
  return (
    <div className="space-y-4">
      {/* Header with overall score */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div
            className={`text-4xl font-bold ${overallScoreColor(job.overall_score)}`}
          >
            {job.overall_score}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">
            / 10
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View posting
          </a>
        </div>
      </div>

      {/* LLM Dimension cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {job.dimensions.map((dim) => (
          <DimensionCard key={dim.name} dimension={dim} />
        ))}
      </div>

      {/* Deterministic Assessments */}
      {job.deterministic && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Data-Driven Assessments
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StatusBadge
              label="Visa"
              status={visaLabel(job.deterministic.visa.status)}
              variant={visaBadgeVariant(job.deterministic.visa.status)}
            />
            <StatusBadge
              label="Comp"
              status={job.deterministic.compensation.status.replace("_", " ")}
              variant={compBadgeVariant(job.deterministic.compensation.status)}
            />
            <StatusBadge
              label="Location"
              status={job.deterministic.location.status}
              variant={locationBadgeVariant(job.deterministic.location.status)}
            />
            <StatusBadge
              label="Education"
              status={job.deterministic.education.status}
              variant={eduBadgeVariant(job.deterministic.education.status)}
            />
          </div>

          {/* ATS Keywords */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 shrink-0">ATS Match</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${job.deterministic.ats_keywords.match_percentage}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-700">
                {job.deterministic.ats_keywords.match_percentage}%
              </span>
            </div>

            {job.deterministic.ats_keywords.matched_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-[88px]">
                {job.deterministic.ats_keywords.matched_keywords.slice(0, 8).map((kw) => (
                  <span
                    key={kw}
                    className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {job.deterministic.ats_keywords.missing_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-[88px]">
                {job.deterministic.ats_keywords.missing_keywords.slice(0, 8).map((kw) => (
                  <span
                    key={kw}
                    className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing Requirements */}
      {job.missing_requirements &&
        (job.missing_requirements.required.length > 0 ||
          job.missing_requirements.preferred.length > 0) && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Missing Requirements
            </h4>

            {job.missing_requirements.required.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-red-600 uppercase">
                  Required (must-have)
                </span>
                <ul className="mt-1 space-y-0.5">
                  {job.missing_requirements.required.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-red-700 flex items-start gap-1"
                    >
                      <span className="text-red-400 mt-px">-</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.missing_requirements.preferred.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-yellow-600 uppercase">
                  Preferred (nice-to-have)
                </span>
                <ul className="mt-1 space-y-0.5">
                  {job.missing_requirements.preferred.map((p, i) => (
                    <li
                      key={i}
                      className="text-xs text-yellow-700 flex items-start gap-1"
                    >
                      <span className="text-yellow-400 mt-px">-</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      {/* Strengths & Concerns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
            Strengths
          </h4>
          <ul className="space-y-2">
            {job.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium">{s.text}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.evidence}{" "}
                  <span className="font-mono text-[10px] text-gray-400">
                    [{s.source}]
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
            Concerns
          </h4>
          <ul className="space-y-2">
            {job.concerns.map((c, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium">{c.text}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.evidence}{" "}
                  <span className="font-mono text-[10px] text-gray-400">
                    [{c.source}]
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
          Recommended Next Steps
        </h4>
        <p className="text-sm text-blue-900">{job.next_steps}</p>
      </div>

      {/* Action buttons */}
      {(onTailor || onCoverLetter) && (
        <div className="flex gap-3 pt-2">
          {onTailor && (
            <button
              onClick={onTailor}
              disabled={tailorLoading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {tailorLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Tailoring...
                </span>
              ) : (
                "Tailor Resume"
              )}
            </button>
          )}
          {onCoverLetter && (
            <button
              onClick={onCoverLetter}
              disabled={coverLetterLoading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {coverLetterLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </span>
              ) : (
                "Generate Cover Letter"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
