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
  scraper_latency_ms: number;
  method: string;
  total_jobs_found: number;
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
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
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
      <h3 className="text-sm font-semibold text-gray-900">Pipeline Metrics</h3>

      <div className="border border-gray-200 rounded-lg p-3">
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
              {scoutMetadata.scraper_latency_ms > 0 && (
                <Stat
                  label="Scraper"
                  value={formatMs(scoutMetadata.scraper_latency_ms)}
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
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Parallel speedup:</span>
                <span className="font-mono font-medium text-green-700">
                  {(
                    enrichMetrics.sequential_estimate_ms /
                    enrichMetrics.total_latency_ms
                  ).toFixed(1)}
                  x
                </span>
                <span className="text-gray-400">
                  ({formatMs(enrichMetrics.sequential_estimate_ms)} sequential vs{" "}
                  {formatMs(enrichMetrics.total_latency_ms)} parallel)
                </span>
              </div>
              {enrichMetrics.tinyfish_steps_total > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  TinyFish steps consumed: {enrichMetrics.tinyfish_steps_total}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
