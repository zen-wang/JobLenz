"use client";

import { useState } from "react";
import type { AssessmentDimension } from "@/lib/types";

interface FitReportProps {
  job: {
    url: string;
    title: string;
    overall_score: number;
    skills_match: AssessmentDimension;
    experience_fit: AssessmentDimension;
    visa_compatibility: AssessmentDimension;
    domain_relevance: AssessmentDimension;
    next_steps: string;
  };
  onTailor?: () => void;
  onCoverLetter?: () => void;
  tailorLoading?: boolean;
  coverLetterLoading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--accent-green)";
  if (score >= 60) return "var(--accent-orange)";
  return "var(--accent-red)";
}

function DimensionBar({
  label,
  weight,
  dimension,
}: {
  label: string;
  weight: string;
  dimension: AssessmentDimension;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(dimension.score);

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 w-28 shrink-0">
          <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
            {label}
          </span>
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {weight}
          </span>
        </div>
        <div className="flex-1 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${dimension.score}%`, background: color, opacity: 0.8 }}
          />
        </div>
        <span className="text-[13px] font-mono font-semibold w-10 text-right" style={{ color }}>
          {dimension.score}
        </span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="ml-[120px] space-y-1.5">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {dimension.reasoning}
          </p>
          {dimension.data_points.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dimension.data_points.map((dp, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] glass-badge glass-badge-gray rounded font-mono"
                >
                  {dp}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FitReport({
  job,
  onTailor,
  onCoverLetter,
  tailorLoading,
  coverLetterLoading,
}: FitReportProps) {
  const overallColor = scoreColor(job.overall_score);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: overallColor }}>
            {job.overall_score}%
          </div>
          <div className="text-[9px] font-label uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            overall fit
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{job.title}</h3>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline"
            style={{ color: "var(--accent-blue)" }}
          >
            View posting
          </a>
        </div>
      </div>

      {/* 4 Dimension bars */}
      <div className="space-y-3">
        <DimensionBar label="Skills Match" weight="25%" dimension={job.skills_match} />
        <DimensionBar label="Experience Fit" weight="30%" dimension={job.experience_fit} />
        <DimensionBar label="Visa" weight="25%" dimension={job.visa_compatibility} />
        <DimensionBar label="Domain" weight="20%" dimension={job.domain_relevance} />
      </div>

      {/* Formula display */}
      <div className="glass-inner p-2.5 rounded-lg">
        <div className="text-[10px] font-mono text-center" style={{ color: "var(--text-muted)" }}>
          {job.skills_match.score}
          <span style={{ color: "var(--text-muted)", opacity: 0.5 }}> x0.25</span>
          {" + "}
          {job.experience_fit.score}
          <span style={{ color: "var(--text-muted)", opacity: 0.5 }}> x0.3</span>
          {" + "}
          {job.visa_compatibility.score}
          <span style={{ color: "var(--text-muted)", opacity: 0.5 }}> x0.25</span>
          {" + "}
          {job.domain_relevance.score}
          <span style={{ color: "var(--text-muted)", opacity: 0.5 }}> x0.2</span>
          {" = "}
          <span style={{ color: overallColor, fontWeight: 600 }}>{job.overall_score}%</span>
        </div>
      </div>

      {/* Next steps */}
      <div className="glass-inner p-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
        <h4 className="text-xs font-semibold font-label uppercase tracking-wider mb-1" style={{ color: "var(--accent-blue)" }}>
          Recommended Next Steps
        </h4>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{job.next_steps}</p>
      </div>

      {/* Action buttons */}
      {(onTailor || onCoverLetter) && (
        <div className="flex gap-3 pt-2">
          {onTailor && (
            <button
              onClick={onTailor}
              disabled={tailorLoading}
              className="flex-1 px-4 py-2 text-sm glass-btn glass-btn-primary"
            >
              {tailorLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full" />
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
              className="flex-1 px-4 py-2 text-sm glass-btn glass-btn-green"
            >
              {coverLetterLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full" />
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
