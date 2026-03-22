import { NextRequest, NextResponse } from "next/server";
import { runScout } from "@/lib/tinyfish";
import { scrapeJobLinks } from "@/lib/scraper";
import { ensureSeeded } from "@/lib/seed";
import {
  extractDomain,
  domainToCompanyName,
  normalizeCareersUrl,
} from "@/lib/utils";
import type { DiscoverRequest, DiscoverResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  await ensureSeeded();

  const start = Date.now();

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

  try {
    const scout = await runScout(careersUrl, role_query, location);

    // Merge scout jobs into a deduped map keyed by URL
    const jobMap = new Map<string, { title: string; url: string; location?: string }>();
    for (const j of scout.result.jobs) {
      jobMap.set(j.url, { title: j.title, url: j.url, location: j.location });
    }

    // If the URL changed, run the hardcoded scraper for additional listings
    let scraperLatency = 0;
    let method: "scout+scraper" | "scout_only" = "scout_only";

    if (scout.result.url_changed && scout.result.filtered_url) {
      method = "scout+scraper";
      try {
        const scraped = await scrapeJobLinks(scout.result.filtered_url);
        scraperLatency = scraped.latency_ms;
        for (const j of scraped.jobs) {
          if (!jobMap.has(j.url)) {
            jobMap.set(j.url, { title: j.title, url: j.url, location: j.location });
          }
        }
      } catch (err) {
        console.warn("[discover] Scraper failed, using scout results only:", err);
      }
    }

    const allJobs = Array.from(jobMap.values());

    const result: DiscoverResult = {
      company: {
        name: companyName,
        domain,
        careers_url: scout.result.filtered_url || careersUrl,
      },
      jobs: allJobs,
      scout_metadata: {
        filtered_url: scout.result.filtered_url,
        url_changed: scout.result.url_changed,
        method,
        scout_latency_ms: scout.latency_ms,
        scout_steps: scout.steps_used,
        scraper_latency_ms: scraperLatency,
        total_jobs_found: allJobs.length,
      },
    };

    return NextResponse.json(result, {
      headers: {
        "X-Cache": scout.cached ? "HIT" : "MISS",
        "X-Latency-Ms": String(Date.now() - start),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
