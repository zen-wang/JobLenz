"use client";

import { useState } from "react";
import type { CoverLetterResult } from "@/lib/types";

interface CoverLetterViewProps {
  result: CoverLetterResult;
}

export default function CoverLetterView({ result }: CoverLetterViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Cover Letter</h4>
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      {/* Key points */}
      {result.key_points.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Key Points Addressed
          </h5>
          <ul className="space-y-0.5">
            {result.key_points.map((point, i) => (
              <li key={i} className="text-xs text-blue-800">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cover letter text */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {result.cover_letter}
        </div>
      </div>
    </div>
  );
}
