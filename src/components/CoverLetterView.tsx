"use client";

import { useState } from "react";
import type { CoverLetterResult } from "@/lib/types";
import { slugify, downloadBlob } from "@/lib/utils";

interface CoverLetterViewProps {
  result: CoverLetterResult;
  jobTitle: string;
}

export default function CoverLetterView({ result, jobTitle }: CoverLetterViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    downloadBlob(result.cover_letter, `cover-letter-${slugify(jobTitle)}.txt`, "text/plain");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cover Letter</h4>
        <div className="flex gap-1.5">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs glass-btn"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={handleDownloadTxt}
            className="px-3 py-1 text-xs glass-btn glass-btn-primary"
          >
            Export .txt
          </button>
        </div>
      </div>

      {result.key_points.length > 0 && (
        <div className="glass-inner p-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          <h5 className="text-xs font-semibold font-label uppercase tracking-wider mb-1" style={{ color: "var(--accent-blue)" }}>
            Key Points Addressed
          </h5>
          <ul className="space-y-0.5">
            {result.key_points.map((point, i) => (
              <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-inner p-4">
        <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {result.cover_letter}
        </div>
      </div>
    </div>
  );
}
