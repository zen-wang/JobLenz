/**
 * Web search → extract company career pages → return for TinyFish scouting.
 *
 * Flow:
 * 1. Call Serper (Google Search API) with job-focused query
 * 2. Extract unique company domains from search results
 * 3. Derive careers URLs for each company
 * 4. Return top N companies for TinyFish to scout
 */

export interface CompanyTarget {
  name: string;
  domain: string;
  careers_url: string;
  source_url: string; // the search result URL that led us here
}

interface SerperResult {
  organic?: {
    title: string;
    link: string;
    snippet?: string;
    position?: number;
  }[];
}

/**
 * Search Google via Serper API for companies hiring for the given roles.
 * Extracts unique company domains and derives career page URLs.
 */
export async function searchCompanies(
  positions: string[],
  location: string,
  limit: number = 5,
): Promise<{ companies: CompanyTarget[]; latency_ms: number }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY not set — required for company discovery");
  }

  const start = Date.now();

  // Build a simple search query — Serper chokes on complex site: OR chains
  const roleQuery = positions[0]; // Use primary role for cleaner results
  const locationPart = location ? ` ${location}` : "";
  const query = `${roleQuery} careers jobs${locationPart}`;

  console.log(`[company-search] Query: "${query}"`);

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 30 }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
  }

  const data: SerperResult = await res.json();
  const latency_ms = Date.now() - start;

  if (!data.organic?.length) {
    return { companies: [], latency_ms };
  }

  // Extract unique company domains from search results
  const seen = new Set<string>();
  const companies: CompanyTarget[] = [];

  for (const result of data.organic) {
    if (companies.length >= limit) break;

    const parsed = parseCompanyFromUrl(result.link, result.title);
    if (!parsed) continue;
    if (seen.has(parsed.domain)) continue;

    seen.add(parsed.domain);
    companies.push({
      name: parsed.name,
      domain: parsed.domain,
      careers_url: parsed.careers_url,
      source_url: result.link,
    });
  }

  console.log(
    `[company-search] Found ${companies.length} companies from ${data.organic.length} search results in ${latency_ms}ms`,
  );

  return { companies, latency_ms };
}

/**
 * Parse a search result URL to extract company info and derive a careers URL.
 *
 * Handles common ATS patterns:
 * - boards.greenhouse.io/{company}/jobs → https://{company}.com/careers
 * - jobs.lever.co/{company} → https://{company}.com/careers
 * - {company}.com/careers/... → https://{company}.com/careers
 * - {company}.com/jobs/... → https://{company}.com/jobs
 */
function parseCompanyFromUrl(
  url: string,
  title: string,
): { name: string; domain: string; careers_url: string } | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    // Greenhouse: boards.greenhouse.io/{company}/jobs/...
    if (hostname === "boards.greenhouse.io" || hostname.endsWith(".greenhouse.io")) {
      const slug = parsed.pathname.split("/")[1];
      if (!slug) return null;
      const name = slugToName(slug);
      return {
        name,
        domain: `${slug}.com`,
        careers_url: `https://boards.greenhouse.io/${slug}/jobs`,
      };
    }

    // Lever: jobs.lever.co/{company}/...
    if (hostname === "jobs.lever.co") {
      const slug = parsed.pathname.split("/")[1];
      if (!slug) return null;
      const name = slugToName(slug);
      return {
        name,
        domain: `${slug}.com`,
        careers_url: `https://jobs.lever.co/${slug}`,
      };
    }

    // Direct company career pages: {company}.com/careers or /jobs
    if (
      parsed.pathname.includes("/careers") ||
      parsed.pathname.includes("/jobs") ||
      parsed.pathname.includes("/positions")
    ) {
      const namePart = hostname.split(".")[0];
      // Skip generic job board domains
      if (isJobBoard(hostname)) return null;

      const careersPath = parsed.pathname.match(
        /^(\/[^/]*(?:careers|jobs|positions)[^/]*)/,
      );
      return {
        name: slugToName(namePart),
        domain: hostname,
        careers_url: `${parsed.origin}${careersPath?.[1] ?? "/careers"}`,
      };
    }

    // Fallback: if it looks like a company domain, try /careers
    if (!isJobBoard(hostname) && hostname.split(".").length <= 3) {
      const namePart = hostname.split(".")[0];
      return {
        name: titleToCompanyName(title) || slugToName(namePart),
        domain: hostname,
        careers_url: `${parsed.origin}/careers`,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/** Convert a URL slug to a display name: "open-ai" → "Open Ai" */
function slugToName(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Try to extract company name from a search result title */
function titleToCompanyName(title: string): string | null {
  // Common patterns: "ML Engineer at Anthropic" or "Anthropic - ML Engineer"
  const atMatch = title.match(/at\s+([A-Z][A-Za-z0-9\s&.]+)/);
  if (atMatch) return atMatch[1].trim();
  const dashMatch = title.match(/^([A-Z][A-Za-z0-9\s&.]+?)\s*[-–—|]/);
  if (dashMatch) return dashMatch[1].trim();
  return null;
}

/** Check if a hostname is a job board (not an individual company) */
function isJobBoard(hostname: string): boolean {
  const boards = [
    "indeed.com",
    "linkedin.com",
    "glassdoor.com",
    "ziprecruiter.com",
    "monster.com",
    "dice.com",
    "careerbuilder.com",
    "simplyhired.com",
    "google.com",
    "bing.com",
    "salary.com",
    "levels.fyi",
    "builtin.com",
    "wellfound.com",
    "angel.co",
    "stackoverflow.com",
    "github.com",
    "remoteok.com",
    "weworkremotely.com",
    "flexjobs.com",
  ];
  return boards.some((b) => hostname === b || hostname.endsWith(`.${b}`));
}
