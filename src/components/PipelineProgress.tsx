"use client";

import { useRef, useEffect } from "react";
import type { PipelineStage } from "@/lib/types";

interface PipelineProgressProps {
  stage: PipelineStage;
  discoverLogs?: string[];
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "discovering", label: "Discover" },
  { key: "enriching", label: "Enrich" },
  { key: "scoring", label: "Score" },
  { key: "tailoring", label: "Tailor" },
  { key: "cover_letter", label: "Cover Letter" },
];

type StageStatus = "pending" | "running" | "done" | "failed";

function getStatus(
  stageKey: PipelineStage,
  currentStage: PipelineStage,
): StageStatus {
  if (currentStage === "error") return "failed";

  const stageOrder: Record<string, number> = {
    idle: 0,
    discovering: 1,
    enriching: 2,
    scoring: 3,
    tailoring: 4,
    cover_letter: 5,
    complete: 6,
  };

  const stageKeyOrder: Record<string, number> = {
    discovering: 1,
    enriching: 2,
    scoring: 3,
    tailoring: 4,
    cover_letter: 5,
  };

  const currentIdx = stageOrder[currentStage] ?? 0;
  const thisIdx = stageKeyOrder[stageKey] ?? 0;

  if (stageKey === "tailoring" || stageKey === "cover_letter") {
    if (currentStage === stageKey) return "running";
    if (currentIdx > thisIdx) return "done";
    if (currentStage === "complete" && currentIdx > thisIdx) return "done";
    return "pending";
  }

  if (thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx && currentStage !== "idle" && currentStage !== "complete")
    return "running";
  if (currentStage === "complete" && thisIdx <= 3) return "done";
  return "pending";
}

export default function PipelineProgress({ stage, discoverLogs }: PipelineProgressProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discoverLogs]);

  if (stage === "idle") return null;

  const showLogs = stage === "discovering" && discoverLogs && discoverLogs.length > 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const status = getStatus(s.key, stage);
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-full h-2 rounded-full transition-all duration-500
                    ${status === "done" ? "shadow-[0_0_8px_rgba(16,185,129,0.3)]" : ""}
                    ${status === "running" ? "animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.3)]" : ""}
                    ${status === "pending" ? "" : ""}
                  `}
                  style={{
                    backgroundColor:
                      status === "done" ? "var(--accent-green)" :
                      status === "running" ? "var(--accent-blue)" :
                      status === "failed" ? "var(--accent-red)" :
                      "rgba(255,255,255,0.05)",
                    opacity: status === "pending" ? 1 : 0.7,
                  }}
                />
                <span
                  className="mt-1.5 text-xs font-medium"
                  style={{
                    color:
                      status === "done" ? "var(--accent-green)" :
                      status === "running" ? "var(--accent-blue)" :
                      status === "failed" ? "var(--accent-red)" :
                      "var(--text-muted)",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="w-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {showLogs && (
        <div className="glass-inner rounded-lg p-3 max-h-36 overflow-y-auto font-mono text-xs">
          {discoverLogs.map((msg, i) => (
            <div
              key={i}
              style={{
                color: i === discoverLogs.length - 1
                  ? "var(--accent-blue)"
                  : "var(--text-muted)",
              }}
            >
              {msg}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
