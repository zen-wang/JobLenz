"use client";

import type { PipelineStage } from "@/lib/types";

interface PipelineProgressProps {
  stage: PipelineStage;
}

const STAGES: { key: PipelineStage | "tailoring" | "cover_letter"; label: string }[] = [
  { key: "discovering", label: "Discover" },
  { key: "enriching", label: "Enrich" },
  { key: "scoring", label: "Score" },
  { key: "tailoring", label: "Tailor" },
  { key: "cover_letter", label: "Cover Letter" },
];

type StageStatus = "pending" | "running" | "done" | "failed";

function getStatus(
  stageKey: string,
  currentStage: PipelineStage,
): StageStatus {
  if (currentStage === "error") {
    // Mark everything up to the failed stage
    const order = ["discovering", "enriching", "scoring", "tailoring", "cover_letter"];
    const idx = order.indexOf(stageKey);
    // We don't know exactly which stage failed, so show the last running as failed
    return idx === 0 ? "failed" : "pending";
  }

  const stageOrder: Record<string, number> = {
    idle: 0,
    discovering: 1,
    enriching: 2,
    scoring: 3,
    complete: 4,
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
