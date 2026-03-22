"use client";

import { useState, useMemo } from "react";
import type { TailorResult } from "@/lib/types";
import { renderResumxToHtml } from "@/lib/resumx-render";
import { slugify, downloadBlob } from "@/lib/utils";

interface TailorViewProps {
  result: TailorResult;
  jobTitle: string;
}

export default function TailorView({ result, jobTitle }: TailorViewProps) {
  const [copied, setCopied] = useState(false);

  const slug = slugify(jobTitle);
  const resumeHtml = useMemo(
    () => renderResumxToHtml(result.tailored_markdown),
    [result.tailored_markdown],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.tailored_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    downloadBlob(result.tailored_markdown, `resume-${slug}.md`, "text/markdown");
  };

  const handleDownloadHtml = () => {
    downloadBlob(resumeHtml, `resume-${slug}.html`, "text/html");
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(resumeHtml);
    win.document.close();
    win.onload = () => win.print();
  };

  const { changes_summary } = result;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Tailored Resume
        </h4>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={handleCopy} className="px-2.5 py-1 text-xs glass-btn">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={handleDownloadMd} className="px-2.5 py-1 text-xs glass-btn">
            .md
          </button>
          <button onClick={handleDownloadHtml} className="px-2.5 py-1 text-xs glass-btn glass-btn-primary">
            .html
          </button>
          <button onClick={handlePrint} className="px-2.5 py-1 text-xs glass-btn glass-btn-primary">
            Print / PDF
          </button>
        </div>
      </div>

      {/* Changes summary */}
      <div className="glass-inner p-3 space-y-1" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
        <h5 className="text-xs font-semibold font-label uppercase tracking-wider" style={{ color: "var(--accent-orange)" }}>
          Changes Made
        </h5>
        <div className="text-xs space-y-0.5" style={{ color: "#FDBA74" }}>
          {changes_summary.sections_reordered.length > 0 && (
            <p>
              Sections reordered: {changes_summary.sections_reordered.join(" -> ")}
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
                  className="inline-block px-1.5 py-0.5 glass-badge glass-badge-yellow rounded text-[10px] mr-1"
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

      <div className="glass-inner rounded-lg overflow-hidden">
        <iframe
          srcDoc={resumeHtml}
          title="Resume Preview"
          className="w-full rounded-lg"
          style={{ height: "800px", border: "none" }}
        />
      </div>
    </div>
  );
}
