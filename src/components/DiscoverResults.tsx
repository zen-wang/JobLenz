"use client";

import type { DiscoverResult } from "@/lib/types";

interface DiscoverResultsProps {
  result: DiscoverResult;
}

export default function DiscoverResults({ result }: DiscoverResultsProps) {
  const { company, jobs, scout_metadata } = result;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {company.name} — {jobs.length} jobs found
        </h3>
        <span className="text-xs text-gray-500">
          via {scout_metadata.method === "scout+scraper" ? "Scout + Scraper" : "Scout only"}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {jobs.slice(0, 20).map((job) => (
          <div
            key={job.url}
            className="px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {job.title}
            </a>
            {job.location && (
              <p className="text-xs text-gray-500 mt-0.5">{job.location}</p>
            )}
          </div>
        ))}
        {jobs.length > 20 && (
          <div className="px-3 py-2 text-xs text-gray-500 text-center">
            + {jobs.length - 20} more jobs
          </div>
        )}
      </div>
    </div>
  );
}
