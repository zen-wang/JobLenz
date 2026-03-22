"use client";

import { useState } from "react";
import type { FitDimension } from "@/lib/types";

interface DimensionCardProps {
  dimension: FitDimension;
}

function scoreColor(score: number): string {
  if (score >= 7) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 4) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function confidenceBadge(confidence: "high" | "medium" | "low"): {
  color: string;
  label: string;
} {
  switch (confidence) {
    case "high":
      return { color: "bg-green-100 text-green-700", label: "HIGH" };
    case "medium":
      return { color: "bg-yellow-100 text-yellow-700", label: "MED" };
    case "low":
      return { color: "bg-red-100 text-red-700", label: "LOW" };
  }
}

export default function DimensionCard({ dimension }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const badge = confidenceBadge(dimension.confidence);

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold rounded-lg border ${scoreColor(dimension.score)}`}
          >
            {dimension.score}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {dimension.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${badge.color}`}
            title={dimension.confidence_reason}
          >
            {badge.label}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed">
            {dimension.reasoning}
          </p>
          <div className="flex flex-wrap gap-1">
            {dimension.sources.map((src) => (
              <span
                key={src}
                className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-mono"
              >
                {src}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 italic">
            {dimension.confidence_reason}
          </p>
        </div>
      )}
    </div>
  );
}
