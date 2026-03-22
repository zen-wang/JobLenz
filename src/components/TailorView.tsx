"use client";

import { useState } from "react";
import type { TailorResult } from "@/lib/types";

interface TailorViewProps {
  result: TailorResult;
  jobTitle: string;
}

export default function TailorView({ result, jobTitle }: TailorViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.tailored_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.tailored_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { changes_summary } = result;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Tailored Resume
        </h4>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Download .md
          </button>
        </div>
      </div>

      {/* Changes summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
        <h5 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          Changes Made
        </h5>
        <div className="text-xs text-amber-700 space-y-0.5">
          {changes_summary.sections_reordered.length > 0 && (
            <p>
              Sections reordered: {changes_summary.sections_reordered.join(" → ")}
            </p>
          )}
          {changes_summary.bullets_reordered > 0 && (
            <p>Bullets reprioritized: {changes_summary.bullets_reordered}</p>
          )}
          {changes_summary.keywords_added.length > 0 && (
            <p>
              Keywords added:{" "}
              {changes_summary.keywords_added.map((k) => (
                <span
                  key={k}
                  className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] mr-1"
                >
                  {k}
                </span>
              ))}
            </p>
          )}
          {changes_summary.content_removed.length > 0 && (
            <p>
              Content trimmed: {changes_summary.content_removed.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Markdown code block */}
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
          {result.tailored_markdown}
        </pre>
      </div>

      <p className="text-xs text-gray-500">
        Save this file and run{" "}
        <code className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">
          resumx resume.md
        </code>{" "}
        to generate your PDF.
      </p>
    </div>
  );
}
