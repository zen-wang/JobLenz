"use client";

import type { FitDimension, Evidence } from "@/lib/types";
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

      {/* Dimension cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {job.dimensions.map((dim) => (
          <DimensionCard key={dim.name} dimension={dim} />
        ))}
      </div>

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
