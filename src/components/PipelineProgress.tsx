"use client";

import type { PipelineStage } from "@/lib/types";

interface PipelineProgressProps {
  stage: PipelineStage;
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
  if (currentStage === "error") {
    return "failed";
  }

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

  // Tailor and Cover Letter are on-demand — only show as done/running
  // if the pipeline has actually entered those stages
  if (stageKey === "tailoring" || stageKey === "cover_letter") {
    if (currentStage === stageKey) return "running";
    if (currentIdx > thisIdx) return "done";
    // In "complete" state, only mark tailor/cover_letter done if we went through them
    if (currentStage === "complete" && currentIdx > thisIdx) return "done";
    return "pending";
  }

  if (thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx && currentStage !== "idle" && currentStage !== "complete")
    return "running";
  if (currentStage === "complete" && thisIdx <= 3) return "done";
  return "pending";
}

export default function PipelineProgress({ stage }: PipelineProgressProps) {
  if (stage === "idle") return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const status = getStatus(s.key, stage);
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-full h-2 rounded-full transition-all duration-500
                    ${status === "done" ? "bg-green-500" : ""}
                    ${status === "running" ? "bg-blue-500 animate-pulse" : ""}
                    ${status === "failed" ? "bg-red-500" : ""}
                    ${status === "pending" ? "bg-gray-200" : ""}
                  `}
                />
                <span
                  className={`
                    mt-1.5 text-xs font-medium
                    ${status === "done" ? "text-green-700" : ""}
                    ${status === "running" ? "text-blue-600" : ""}
                    ${status === "failed" ? "text-red-600" : ""}
                    ${status === "pending" ? "text-gray-400" : ""}
                  `}
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
    </div>
  );
}
