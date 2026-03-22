"use client";

interface Metrics {
  total_latency_ms: number;
  sequential_estimate_ms: number;
  tinyfish_steps_total: number;
  agents_succeeded: number;
  agents_failed: number;
  cache_hits: number;
}

interface ScoutMetadata {
  scout_latency_ms: number;
  scout_steps: number;
  method: string;
  total_jobs_found: number;
  filter_stats?: {
    total_raw: number;
    total_filtered: number;
    removed_count: number;
  };
}

interface LLMMetadata {
  provider: string;
  model: string;
  total_latency_ms: number;
  jobs_scored: number;
  jobs_skipped: number;
}

interface ObservabilityPanelProps {
  scoutMetadata?: ScoutMetadata;
  enrichMetrics?: Metrics;
  llmMetadata?: LLMMetadata;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-[10px] font-label uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ObservabilityPanel({
  scoutMetadata,
  enrichMetrics,
  llmMetadata,
}: ObservabilityPanelProps) {
  const hasAny = scoutMetadata || enrichMetrics || llmMetadata;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Pipeline Metrics</h3>

      <div className="glass-inner p-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {scoutMetadata && (
            <>
              <Stat
                label="Jobs Found"
                value={scoutMetadata.total_jobs_found}
              />
              <Stat
                label="Scout"
                value={
                  scoutMetadata.scout_latency_ms === 0
                    ? "cached"
                    : formatMs(scoutMetadata.scout_latency_ms)
                }
              />
              {scoutMetadata.filter_stats && (
                <Stat
                  label="Filter"
                  value={`${scoutMetadata.filter_stats.total_filtered}/${scoutMetadata.filter_stats.total_raw}`}
                />
              )}
            </>
          )}

          {enrichMetrics && (
            <>
              <Stat
                label="Enrich"
                value={formatMs(enrichMetrics.total_latency_ms)}
              />
              <Stat
                label="Agents OK"
                value={`${enrichMetrics.agents_succeeded}/${enrichMetrics.agents_succeeded + enrichMetrics.agents_failed}`}
              />
              <Stat label="Cache Hits" value={enrichMetrics.cache_hits} />
            </>
          )}

          {llmMetadata && (
            <>
              <Stat
                label="Scoring"
                value={formatMs(llmMetadata.total_latency_ms)}
              />
              <Stat
                label="LLM"
                value={llmMetadata.provider}
              />
              <Stat
                label="Scored"
                value={`${llmMetadata.jobs_scored} jobs`}
              />
            </>
          )}
        </div>

        {enrichMetrics &&
          enrichMetrics.sequential_estimate_ms > 0 &&
          enrichMetrics.total_latency_ms > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-900/30">
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>Parallel speedup:</span>
                <span className="font-mono font-medium" style={{ color: "var(--accent-green)" }}>
                  {(
                    enrichMetrics.sequential_estimate_ms /
                    enrichMetrics.total_latency_ms
                  ).toFixed(1)}
                  x
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  ({formatMs(enrichMetrics.sequential_estimate_ms)} seq vs{" "}
                  {formatMs(enrichMetrics.total_latency_ms)} par)
                </span>
              </div>
              {enrichMetrics.tinyfish_steps_total > 0 && (
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  TinyFish steps: {enrichMetrics.tinyfish_steps_total}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
