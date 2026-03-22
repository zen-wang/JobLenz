import { NextRequest, NextResponse } from "next/server";
import { runScout } from "@/lib/tinyfish";
import { scrapeJobLinks } from "@/lib/scraper";
import { ensureSeeded } from "@/lib/seed";
import { filterJobsByRelevance } from "@/lib/filter";
import {
  extractDomain,
  domainToCompanyName,
  normalizeCareersUrl,
} from "@/lib/utils";
import type { DiscoverRequest, DiscoverResult, DiscoverSSEEvent } from "@/lib/types";

function sseEncode(event: DiscoverSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  await ensureSeeded();

  let body: DiscoverRequest;
  try {
    body = (await req.json()) as DiscoverRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_url, role_query, location } = body;

  if (!company_url || !role_query) {
    return NextResponse.json(
      { error: "company_url and role_query are required" },
      { status: 400 },
    );
  }

  const domain = extractDomain(company_url);
  const companyName = domainToCompanyName(domain);
  const careersUrl = normalizeCareersUrl(company_url);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: DiscoverSSEEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      try {
        const start = Date.now();

        // ── Seed cache ──
        emit({
          type: "progress",
          message: "Loading seed cache...",
          sub_stage: "seed",
        });

        // ── Scout ──
        emit({
          type: "progress",
          message: `Scouting ${companyName} careers page...`,
          sub_stage: "scout",
          detail: "This may take 15-90s for uncached companies",
        });

        const scout = await runScout(careersUrl, role_query, location);

        const scoutMsg = scout.cached
          ? `Scout cache hit — ${scout.result.jobs.length} jobs found`
          : `Scout complete — ${scout.result.jobs.length} jobs found in ${(scout.latency_ms / 1000).toFixed(1)}s`;
        emit({
          type: "progress",
          message: scoutMsg,
          sub_stage: "scout",
        });

        // Merge scout jobs into a deduped map keyed by URL
        const jobMap = new Map<string, { title: string; url: string; location?: string }>();
        for (const j of scout.result.jobs) {
          jobMap.set(j.url, { title: j.title, url: j.url, location: j.location });
        }

        // ── Scraper ──
        let scraperLatency = 0;
        let method: "scout+scraper" | "scout_only" = "scout_only";

        if (scout.result.url_changed && scout.result.filtered_url) {
          method = "scout+scraper";
          emit({
            type: "progress",
            message: "Running scraper for additional listings...",
            sub_stage: "scraper",
          });

          try {
            const scraped = await scrapeJobLinks(scout.result.filtered_url);
            scraperLatency = scraped.latency_ms;
            let added = 0;
            for (const j of scraped.jobs) {
              if (!jobMap.has(j.url)) {
                jobMap.set(j.url, { title: j.title, url: j.url, location: j.location });
                added++;
              }
            }
            emit({
              type: "progress",
              message: `Scraper found ${added} additional listings`,
              sub_stage: "scraper",
            });
          } catch (err) {
            console.warn("[discover] Scraper failed, using scout results only:", err);
            emit({
              type: "progress",
              message: "Scraper failed — using scout results only",
              sub_stage: "scraper",
            });
          }
        }

        // ── Dedup ──
        const allJobs = Array.from(jobMap.values());
        emit({
          type: "progress",
          message: `Deduplication complete — ${allJobs.length} unique jobs`,
          sub_stage: "dedup",
        });

        // ── Filter ──
        const { jobs: filteredJobs, stats: filterStats } = filterJobsByRelevance(allJobs, role_query);
        emit({
          type: "progress",
          message: `Filtered: ${filteredJobs.length} of ${allJobs.length} jobs match '${role_query}'`,
          sub_stage: "filter",
        });

        // ── Result ──
        const result: DiscoverResult = {
          company: {
            name: companyName,
            domain,
            careers_url: scout.result.filtered_url || careersUrl,
          },
          jobs: filteredJobs,
          scout_metadata: {
            filtered_url: scout.result.filtered_url,
            url_changed: scout.result.url_changed,
            method,
            scout_latency_ms: scout.latency_ms,
            scout_steps: scout.steps_used,
            scraper_latency_ms: scraperLatency,
            total_jobs_found: allJobs.length,
            filter_stats: filterStats,
          },
        };

        console.log(
          `[discover] Done in ${Date.now() - start}ms — ${filteredJobs.length}/${allJobs.length} jobs after filter, cache=${scout.cached}`,
        );

        emit({ type: "result", data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[discover] Error:", message);
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
