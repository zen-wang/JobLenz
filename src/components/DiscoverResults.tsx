"use client";

import type { DiscoverResult } from "@/lib/types";

interface DiscoverResultsProps {
  result: DiscoverResult;
}

export default function DiscoverResults({ result }: DiscoverResultsProps) {
  const { search_context, jobs, scout_metadata } = result;
  const positionLabel = search_context.positions.join(", ");

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {jobs.length} jobs found
          {scout_metadata.filter_stats && (
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>
              {" "}(filtered from {scout_metadata.filter_stats.total_raw} total)
            </span>
          )}
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          via {search_context.source}
        </span>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Searching: {positionLabel}
        {search_context.location !== "Any location" && (
          <> in {search_context.location}</>
        )}
      </p>

      <div className="max-h-64 overflow-y-auto glass-inner rounded-lg divide-y divide-blue-900/30">
        {jobs.slice(0, 20).map((job) => (
          <div
            key={job.url}
            className="px-3 py-2 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
          >
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:opacity-80 hover:underline transition-colors"
              style={{ color: "var(--accent-blue)" }}
            >
              {job.title}
            </a>
            <div className="flex gap-3 text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {job.company && <span>{job.company}</span>}
              {job.location && <span>{job.location}</span>}
            </div>
          </div>
        ))}
        {jobs.length > 20 && (
          <div className="px-3 py-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
            + {jobs.length - 20} more jobs
          </div>
        )}
      </div>
    </div>
  );
}
