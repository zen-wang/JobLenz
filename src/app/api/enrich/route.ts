import { NextRequest, NextResponse } from "next/server";
import { runEnrichment, runCompanyIntel } from "@/lib/tinyfish";
import { ensureSeeded } from "@/lib/seed";
import type { EnrichRequest, EnrichResult, AgentMetrics } from "@/lib/types";

export async function POST(req: NextRequest) {
  await ensureSeeded();

  const start = Date.now();

  let body: EnrichRequest;
  try {
    body = (await req.json()) as EnrichRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobs, company_name, company_domain, max_jobs } = body;

  if (!jobs?.length || !company_name || !company_domain) {
    return NextResponse.json(
      { error: "jobs, company_name, and company_domain are required" },
      { status: 400 },
    );
  }

  try {
    // Fire JD extraction + company intel in parallel
    const [enrichResult, intelResult] = await Promise.all([
      runEnrichment(jobs, max_jobs ?? 5),
      runCompanyIntel(company_name, company_domain),
    ]);

    const allMetrics: AgentMetrics[] = [
      ...enrichResult.metrics,
      ...intelResult.metrics,
    ];

    const succeeded = allMetrics.filter(
      (m) => m.status === "success" || m.status === "cached",
    ).length;
    const failed = allMetrics.filter((m) => m.status === "failed").length;
    const cacheHits = allMetrics.filter((m) => m.status === "cached").length;
    const totalSteps = allMetrics.reduce(
      (sum, m) => sum + (m.steps_used ?? 0),
      0,
    );
    const sequentialEstimate = allMetrics.reduce(
      (sum, m) => sum + m.latency_ms,
      0,
    );

    const result: EnrichResult = {
      enriched_jobs: enrichResult.results,
      company_intel: intelResult.intel,
      metrics: {
        total_latency_ms: Date.now() - start,
        sequential_estimate_ms: sequentialEstimate,
        tinyfish_steps_total: totalSteps,
        agents_succeeded: succeeded,
        agents_failed: failed,
        cache_hits: cacheHits,
      },
    };

    return NextResponse.json(result, {
      headers: {
        "X-Latency-Ms": String(Date.now() - start),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
