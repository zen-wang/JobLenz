import type {
  ScoutResult,
  JobDetails,
  H1BData,
  ValuesData,
  SalaryData,
  CompanyIntel,
  AgentMetrics,
} from "./types";
import {
  buildScoutGoal,
  buildJDExtractionGoal,
  buildH1BGoal,
  buildValuesGoal,
  buildSalaryGoal,
} from "./agents";
import { cacheKey, cacheGet, cacheSet } from "./cache";

const TINYFISH_URL = "https://agent.tinyfish.ai/v1/automation/run";

interface TinyFishResponse {
  run_id?: string;
  status?: string;
  result?: unknown;
  steps_used?: number;
  error?: string;
}

/**
 * Low-level TinyFish API call.
 * Returns null when TINYFISH_API_KEY is not set (offline/dev mode).
 */
async function callTinyFish(
  url: string,
  goal: string,
): Promise<{ data: unknown; steps_used: number } | null> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("[tinyfish] TINYFISH_API_KEY not set — skipping live call");
    return null;
  }

  const res = await fetch(TINYFISH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ url, goal }),
  });

  if (!res.ok) {
    throw new Error(`TinyFish API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as TinyFishResponse;
  console.log("[tinyfish] Raw response:", JSON.stringify(body).slice(0, 500));

  if (body.error) {
    throw new Error(`TinyFish agent error: ${body.error}`);
  }

  // result is already a parsed object from the JSON response — no JSON.parse needed
  const result = body.result ?? null;
  // Handle edge case: if result is somehow a string, parse it
  const data = typeof result === "string" ? JSON.parse(result) : result;
  return { data, steps_used: body.steps_used ?? 0 };
}

/**
 * Run a cached TinyFish call. Returns the cached result or calls the API.
 * When no API key and no cache, returns null (graceful failure).
 */
async function cachedTinyFishCall<T>(
  url: string,
  goal: string,
  agentId: string,
): Promise<{
  data: T | null;
  metrics: AgentMetrics;
}> {
  const key = cacheKey(url, goal);
  const start = Date.now();

  // Check cache first
  const cached = await cacheGet<T>(key);
  if (cached) {
    return {
      data: cached,
      metrics: {
        agent_id: agentId,
        status: "cached",
        latency_ms: 0,
        steps_used: null,
        cached: true,
      },
    };
  }

  // Try live API
  try {
    const result = await callTinyFish(url, goal);
    if (!result) {
      return {
        data: null,
        metrics: {
          agent_id: agentId,
          status: "failed",
          latency_ms: Date.now() - start,
          steps_used: null,
          cached: false,
          error: "TINYFISH_API_KEY not set and no cache",
        },
      };
    }

    const data = result.data as T;
    await cacheSet(key, data);

    return {
      data,
      metrics: {
        agent_id: agentId,
        status: "success",
        latency_ms: Date.now() - start,
        steps_used: result.steps_used,
        cached: false,
      },
    };
  } catch (err) {
    return {
      data: null,
      metrics: {
        agent_id: agentId,
        status: "failed",
        latency_ms: Date.now() - start,
        steps_used: null,
        cached: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    };
  }
}

// ─── Stage 1: Discovery ──────────────────────────────────────

/**
 * Run the scout agent for a company careers page.
 * Returns cached data when available or when API key is missing.
 */
export async function runScout(
  companyUrl: string,
  roleQuery: string,
  location?: string,
): Promise<{
  result: ScoutResult;
  cached: boolean;
  latency_ms: number;
  steps_used: number;
}> {
  const goal = buildScoutGoal(roleQuery, location);
  const key = cacheKey(companyUrl, goal);

  const cached = await cacheGet<ScoutResult>(key);
  if (cached) {
    return { result: cached, cached: true, latency_ms: 0, steps_used: 0 };
  }

  const start = Date.now();
  const apiResult = await callTinyFish(companyUrl, goal);

  if (!apiResult) {
    throw new Error(
      "No cached data and TINYFISH_API_KEY is not set. " +
        "Seed the cache or provide an API key.",
    );
  }

  const scoutResult = apiResult.data as ScoutResult;
  const latency_ms = Date.now() - start;

  await cacheSet(key, scoutResult);

  return {
    result: scoutResult,
    cached: false,
    latency_ms,
    steps_used: apiResult.steps_used,
  };
}

// ─── Stage 2: Enrichment ─────────────────────────────────────

/**
 * Extract full JDs for an array of job URLs in parallel.
 * Uses Promise.allSettled — individual failures don't block others.
 */
export async function runEnrichment(
  jobs: { title: string; url: string }[],
  maxJobs: number = 5,
): Promise<{
  results: {
    url: string;
    title: string;
    details: JobDetails | null;
    extraction_status: "success" | "failed";
    latency_ms: number;
  }[];
  metrics: AgentMetrics[];
}> {
  const goal = buildJDExtractionGoal();
  const subset = jobs.slice(0, maxJobs);

  const settled = await Promise.allSettled(
    subset.map(async (job) => {
      const { data, metrics } = await cachedTinyFishCall<JobDetails>(
        job.url,
        goal,
        `jd-extract:${job.url}`,
      );

      // Attach source_url if the agent didn't include it
      if (data && !data.source_url) {
        (data as JobDetails).source_url = job.url;
      }

      return {
        url: job.url,
        title: job.title,
        details: data,
        extraction_status: (data ? "success" : "failed") as
          | "success"
          | "failed",
        latency_ms: metrics.latency_ms,
        metrics,
      };
    }),
  );

  const results: {
    url: string;
    title: string;
    details: JobDetails | null;
    extraction_status: "success" | "failed";
    latency_ms: number;
  }[] = [];
  const allMetrics: AgentMetrics[] = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const { metrics, ...rest } = outcome.value;
      results.push(rest);
      allMetrics.push(metrics);
    } else {
      // Promise itself rejected (shouldn't happen with cachedTinyFishCall, but defensive)
      results.push({
        url: "unknown",
        title: "unknown",
        details: null,
        extraction_status: "failed",
        latency_ms: 0,
      });
    }
  }

  return { results, metrics: allMetrics };
}

/**
 * Run company intelligence agents (H-1B, values, salary) in parallel.
 * Each agent runs independently — failures are isolated.
 */
export async function runCompanyIntel(
  companyName: string,
  companyDomain: string,
): Promise<{ intel: CompanyIntel; metrics: AgentMetrics[] }> {
  const h1bUrl = `https://h1bdata.info/index.php?em=${encodeURIComponent(companyName)}`;
  const valuesUrl = `https://${companyDomain}/about`;
  const salaryUrl = `https://www.levels.fyi/companies/${companyName.toLowerCase()}/salaries`;

  const [h1bResult, valuesResult, salaryResult] = await Promise.allSettled([
    cachedTinyFishCall<H1BData>(h1bUrl, buildH1BGoal(), `h1b:${companyName}`),
    cachedTinyFishCall<ValuesData>(
      valuesUrl,
      buildValuesGoal(),
      `values:${companyName}`,
    ),
    cachedTinyFishCall<SalaryData>(
      salaryUrl,
      buildSalaryGoal(),
      `salary:${companyName}`,
    ),
  ]);

  const allMetrics: AgentMetrics[] = [];

  const h1b = extractIntelResult<H1BData>(h1bResult, h1bUrl);
  const values = extractIntelResult<ValuesData>(valuesResult, valuesUrl);
  const salary = extractIntelResult<SalaryData>(salaryResult, salaryUrl);

  if (h1bResult.status === "fulfilled") allMetrics.push(h1bResult.value.metrics);
  if (valuesResult.status === "fulfilled")
    allMetrics.push(valuesResult.value.metrics);
  if (salaryResult.status === "fulfilled")
    allMetrics.push(salaryResult.value.metrics);

  // Attach source_url to intel data if missing
  if (h1b.data && !h1b.data.source_url)
    (h1b.data as H1BData).source_url = h1bUrl;
  if (values.data && !values.data.source_url)
    (values.data as ValuesData).source_url = valuesUrl;
  if (salary.data && !salary.data.source_url)
    (salary.data as SalaryData).source_url = salaryUrl;

  return {
    intel: {
      h1b: {
        status: h1b.data ? "success" : "failed",
        data: h1b.data ?? undefined,
        latency_ms: h1b.latency_ms,
      },
      values: {
        status: values.data ? "success" : "failed",
        data: values.data ?? undefined,
        latency_ms: values.latency_ms,
      },
      salary: {
        status: salary.data ? "success" : "failed",
        data: salary.data ?? undefined,
        latency_ms: salary.latency_ms,
      },
    },
    metrics: allMetrics,
  };
}

/** Helper to extract intel data from a Promise.allSettled outcome. */
function extractIntelResult<T>(
  outcome: PromiseSettledResult<{ data: T | null; metrics: AgentMetrics }>,
  sourceUrl: string,
): { data: T | null; latency_ms: number } {
  if (outcome.status === "fulfilled") {
    return {
      data: outcome.value.data,
      latency_ms: outcome.value.metrics.latency_ms,
    };
  }
  return { data: null, latency_ms: 0 };
}
