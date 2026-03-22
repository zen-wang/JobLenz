import { NextRequest, NextResponse } from "next/server";
import { runScoutSSE } from "@/lib/tinyfish";
import { ensureSeeded } from "@/lib/seed";
import { searchCompanies } from "@/lib/company-search";
import { filterJobsByRelevance } from "@/lib/filter";
import { normalizeCareersUrl } from "@/lib/utils";
import { cacheKey, cacheGet } from "@/lib/cache";
import { buildScoutGoal } from "@/lib/agents";
import type {
  DiscoverRequest,
  DiscoverResult,
  DiscoverSSEEvent,
  ScoutResult,
} from "@/lib/types";

const MAX_COMPANIES = 10;

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

  const { search_preferences } = body;

  if (
    !search_preferences?.positions?.length ||
    !search_preferences.positions.some((p) => p.trim())
  ) {
    return NextResponse.json(
      { error: "At least one position preference is required" },
      { status: 400 },
    );
  }

  const positions = search_preferences.positions.filter((p) => p.trim());
  const location = search_preferences.location || "";
  const skipCache = search_preferences.skip_cache ?? false;
  const targetCompanies = search_preferences.target_companies?.filter((c) => c.trim()) ?? [];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: DiscoverSSEEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      try {
        const start = Date.now();

        // ── Step 1: Web search to find companies ──
        emit({
          type: "progress",
          message: `Searching for companies hiring ${positions.join(", ")}${location ? ` in ${location}` : ""}...`,
          sub_stage: "search",
        });

        const { companies: searchedCompanies, latency_ms: searchLatency } = await searchCompanies(
          positions,
          location,
          MAX_COMPANIES,
        );

        // Merge user-specified target companies (prioritized first)
        const seenDomains = new Set<string>();
        const companies: typeof searchedCompanies = [];

        for (const name of targetCompanies) {
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
          const domain = `${slug}.com`;
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            companies.push({
              name,
              domain,
              careers_url: `https://www.${domain}/careers`,
              source_url: `user-specified`,
            });
          }
        }

        for (const c of searchedCompanies) {
          if (!seenDomains.has(c.domain)) {
            seenDomains.add(c.domain);
            companies.push(c);
          }
        }

        if (companies.length === 0) {
          emit({ type: "error", message: "No companies found for your search. Try broader role terms." });
          controller.close();
          return;
        }

        emit({
          type: "progress",
          message: `Found ${companies.length} companies: ${companies.map((c) => c.name).join(", ")}`,
          sub_stage: "search",
        });

        // ── Step 2: TinyFish scouts each company's careers page ──
        await ensureSeeded();

        const jobMap = new Map<
          string,
          { title: string; url: string; location?: string; company?: string }
        >();
        let totalScoutLatency = 0;
        let totalSteps = 0;
        const companiesScouted: { name: string; domain: string; careers_url: string }[] = [];

        // ── Partition companies into cached vs non-cached ──
        const goal = buildScoutGoal(positions[0], location || undefined);
        const cachedCompanies: { company: typeof companies[0]; careersUrl: string; data: ScoutResult }[] = [];
        const nonCachedCompanies: { company: typeof companies[0]; careersUrl: string }[] = [];

        for (const company of companies) {
          const careersUrl = normalizeCareersUrl(company.careers_url);
          const key = cacheKey(careersUrl, goal);
          const cached = skipCache ? null : await cacheGet<ScoutResult>(key);
          if (cached) {
            cachedCompanies.push({ company, careersUrl, data: cached });
          } else {
            nonCachedCompanies.push({ company, careersUrl });
          }
        }

        // ── Process cached companies first (instant) ──
        for (const { company, careersUrl, data } of cachedCompanies) {
          let added = 0;
          for (const j of data.jobs) {
            if (!jobMap.has(j.url)) {
              jobMap.set(j.url, { title: j.title, url: j.url, location: j.location, company: company.name });
              added++;
            }
          }
          companiesScouted.push({ name: company.name, domain: company.domain, careers_url: careersUrl });
          emit({ type: "progress", message: `${company.name}: cache hit — ${data.jobs.length} jobs`, sub_stage: "scout" });
        }

        // ── Run non-cached companies via SSE with a 3-slot pool ──
        // As each agent finishes, its slot is freed and the next queued company takes over.
        const MAX_SLOTS = 3;
        const queue = [...nonCachedCompanies];

        if (queue.length > 0) {
          // Helper: run one company in a given slot, collect results, then emit slot_done
          const runInSlot = async (
            entry: typeof queue[0],
            slot: number,
          ) => {
            emit({ type: "progress", message: `Scouting ${entry.company.name} careers page...`, sub_stage: "scout", detail: entry.careersUrl });
            try {
              const scout = await runScoutSSE(
                entry.careersUrl,
                positions[0],
                location || undefined,
                (url) => emit({ type: "streaming_url", url, company: entry.company.name, slot }),
                (msg) => emit({ type: "agent_progress", message: msg }),
                skipCache,
              );
              totalScoutLatency += scout.latency_ms;
              totalSteps += scout.steps_used;
              let added = 0;
              for (const j of scout.result.jobs) {
                if (!jobMap.has(j.url)) {
                  jobMap.set(j.url, { title: j.title, url: j.url, location: j.location, company: entry.company.name });
                  added++;
                }
              }
              companiesScouted.push({ name: entry.company.name, domain: entry.company.domain, careers_url: entry.careersUrl });
              const msg = scout.cached
                ? `${entry.company.name}: cache hit — ${scout.result.jobs.length} jobs`
                : `${entry.company.name}: found ${added} jobs in ${(scout.latency_ms / 1000).toFixed(1)}s`;
              emit({ type: "progress", message: msg, sub_stage: "scout" });
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : "Unknown error";
              console.warn(`[discover] Scout failed for ${entry.company.name}:`, errMsg);
              emit({ type: "progress", message: `${entry.company.name}: scout failed — ${errMsg}`, sub_stage: "scout" });
            }
            emit({ type: "slot_done", slot });
          };

          // Slot pool: start up to MAX_SLOTS, each slot self-replenishes from the queue
          let queueIdx = 0;
          const slotWorker = async (slot: number) => {
            while (queueIdx < queue.length) {
              const idx = queueIdx++;
              await runInSlot(queue[idx], slot);
            }
          };

          const workers = Array.from(
            { length: Math.min(MAX_SLOTS, queue.length) },
            (_, i) => slotWorker(i),
          );
          await Promise.all(workers);
        }

        // ── Step 3: Dedup + Filter ──
        const allJobs = Array.from(jobMap.values());
        emit({
          type: "progress",
          message: `${allJobs.length} unique jobs from ${companiesScouted.length} companies`,
          sub_stage: "dedup",
        });

        const combinedQuery = positions.join(" ");
        const { jobs: filteredJobs, stats: filterStats } =
          filterJobsByRelevance(allJobs, combinedQuery);

        emit({
          type: "progress",
          message: `Filtered: ${filteredJobs.length} of ${allJobs.length} jobs match your preferences`,
          sub_stage: "filter",
        });

        // ── Result ──
        const result: DiscoverResult = {
          search_context: {
            positions,
            location: location || "Any location",
            source: "company_scout",
          },
          jobs: filteredJobs,
          scout_metadata: {
            method: "job_search",
            scout_latency_ms: totalScoutLatency + searchLatency,
            scout_steps: totalSteps,
            total_jobs_found: allJobs.length,
            filter_stats: filterStats,
          },
        };

        console.log(
          `[discover] Done in ${Date.now() - start}ms — ${companiesScouted.length} companies, ${filteredJobs.length}/${allJobs.length} jobs after filter`,
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
