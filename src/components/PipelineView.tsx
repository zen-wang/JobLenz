"use client";

import { useRef, useEffect } from "react";
import type { PipelineStage } from "@/lib/types";

interface PipelineViewProps {
  stage: PipelineStage;
  logs: string[];
  discoveredCount: number;
  enrichedCount: number;
  scoredCount: number;
  stepsUsed: number;
  onViewResults?: () => void;
  onStop?: () => void;
  onRetry?: () => void;
  streamingSlots?: { url: string; company: string }[];
  agentProgress?: string[];
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-inner p-3 text-center">
      <div className="text-[10px] font-label uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  discovering: "Discovering jobs...",
  enriching: "Enriching with AI agents...",
  scoring: "Scoring fit with Claude...",
  complete: "Pipeline complete",
  stopped: "Pipeline stopped",
  error: "Pipeline error",
};

export default function PipelineView({
  stage,
  logs,
  discoveredCount,
  enrichedCount,
  scoredCount,
  stepsUsed,
  onViewResults,
  onStop,
  onRetry,
  streamingSlots,
  agentProgress,
}: PipelineViewProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isRunning = stage !== "complete" && stage !== "error" && stage !== "stopped";
  const activeSlots = streamingSlots?.filter(Boolean) ?? [];
  const slotGridCols = activeSlots.length <= 1 ? "grid-cols-1" : activeSlots.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ position: "relative", zIndex: 1 }}>
      <div className="w-full max-w-[680px] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between glass-animate-in">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Pipeline</h1>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{STAGE_LABELS[stage] ?? stage}</p>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && onStop && (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                Stop
              </button>
            )}
            {isRunning && (
              <span className="flex items-center gap-1.5 glass-badge glass-badge-blue px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-blue)" }} />
                running
              </span>
            )}
            {stage === "complete" && (
              <span className="glass-badge glass-badge-green px-2.5 py-1 rounded-lg">complete</span>
            )}
            {stage === "stopped" && (
              <span className="glass-badge glass-badge-yellow px-2.5 py-1 rounded-lg">stopped</span>
            )}
          </div>
        </div>

        {/* 4 metric summary cards */}
        <div className="grid grid-cols-4 gap-2.5 glass-animate-in-delay-1">
          <MetricCard label="Discovered" value={discoveredCount} />
          <MetricCard
            label="Enriched"
            value={stage === "discovering" || stage === "enriching" ? "..." : enrichedCount}
          />
          <MetricCard
            label="Scored"
            value={stage !== "complete" && stage !== "error" && stage !== "stopped" ? "..." : scoredCount}
          />
          <MetricCard
            label="Steps"
            value={stepsUsed > 0 ? stepsUsed : stage === "idle" ? 0 : "..."}
            sub="TinyFish"
          />
        </div>

        {/* Live agent browser views — up to 3 concurrent iframes */}
        {activeSlots.length > 0 && (
          <div className="glass-card p-4 space-y-3 glass-animate-in-delay-2">
            <div className="flex items-center justify-between">
              <h3 className="font-label text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Live agent views
              </h3>
              <span className="flex items-center gap-1.5 glass-badge glass-badge-blue px-2 py-0.5 rounded text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-blue)" }} />
                {activeSlots.length} streaming
              </span>
            </div>
            <div className={`grid ${slotGridCols} gap-2`}>
              {activeSlots.map((slot, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="text-[10px] font-label font-semibold truncate" style={{ color: "var(--text-secondary)" }}>
                    {slot.company}
                  </div>
                  <div className="glass-inner rounded-lg overflow-hidden">
                    <iframe
                      src={slot.url}
                      className="w-full rounded-lg"
                      style={{ height: 180, border: "none" }}
                      sandbox="allow-scripts allow-same-origin"
                      title={`TinyFish live view — ${slot.company}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            {agentProgress && agentProgress.length > 0 && (
              <div className="font-mono text-[10px] px-1" style={{ color: "var(--text-secondary)" }}>
                {agentProgress[agentProgress.length - 1]}
              </div>
            )}
          </div>
        )}

        {/* Pipeline stages — full width */}
        <div className="glass-card p-4 space-y-3 glass-animate-in-delay-2">
          <h3 className="font-label text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pipeline stages</h3>
          {(["discovering", "enriching", "scoring"] as const).map((s) => {
            const idx = { discovering: 1, enriching: 2, scoring: 3 }[s];
            const stageMap: Record<string, number> = { discovering: 1, enriching: 2, scoring: 3, tailoring: 4, cover_letter: 4, complete: 4, stopped: 4, error: 4 };
            const currentIdx = stageMap[stage] ?? 0;
            const isDone = currentIdx > idx;
            const isActive = currentIdx === idx;

            return (
              <div key={s} className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: isDone ? "var(--accent-green)" : isActive ? "var(--accent-blue)" : "rgba(255,255,255,0.1)",
                    boxShadow: isActive ? "0 0 8px var(--accent-blue)" : "none",
                  }}
                />
                <span className="font-label text-[11px] w-20 shrink-0" style={{ color: isDone ? "var(--accent-green)" : isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {s === "discovering" ? "Discover" : s === "enriching" ? "Enrich" : "Score"}
                </span>
                <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: isDone ? "100%" : isActive ? "60%" : "0%",
                      background: isDone ? "var(--accent-green)" : "var(--accent-blue)",
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {isRunning && (
            <div className="flex justify-center pt-2">
              <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>

        {/* Event log */}
        <div className="glass-card p-4 space-y-2 glass-animate-in-delay-3">
          <h3 className="font-label text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Agent event log</h3>
          <div className="glass-inner rounded-lg p-3 max-h-[140px] overflow-y-auto font-mono text-[11px]">
            {logs.length === 0 && (
              <div style={{ color: "var(--text-muted)" }}>Waiting for events...</div>
            )}
            {logs.map((msg, i) => {
              const isLatest = i === logs.length - 1;
              const icon = msg.includes("fail") || msg.includes("error") || msg.includes("stopped") ? "✗" : msg.includes("complete") || msg.includes("cache hit") || msg.includes("Done") ? "✓" : "○";
              const iconColor = icon === "✓" ? "var(--accent-green)" : icon === "✗" ? "var(--accent-red)" : "var(--accent-blue)";
              const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

              return (
                <div key={i} className="flex gap-2 leading-relaxed" style={{ color: isLatest ? "var(--text-primary)" : "var(--text-muted)" }}>
                  <span style={{ color: iconColor }}>{icon}</span>
                  <span style={{ color: "var(--text-muted)" }}>{ts}</span>
                  <span>{msg}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Retry button — shown on stopped or error */}
        {(stage === "stopped" || stage === "error") && onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-3 glass-btn glass-btn-blue text-[14px] font-semibold rounded-xl glass-animate-in"
          >
            Retry
          </button>
        )}

        {/* View results button */}
        {stage === "complete" && onViewResults && (
          <button
            onClick={onViewResults}
            className="w-full py-3 glass-btn glass-btn-green text-[14px] font-semibold rounded-xl glass-animate-in"
          >
            View results
          </button>
        )}
      </div>
    </div>
  );
}
