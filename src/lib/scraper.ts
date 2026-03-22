/**
 * Hardcoded HTML scraper — fast, dumb, 0 credits.
 * Fetches a filtered careers page URL and extracts job listing links.
 */

interface ScrapedJob {
  title: string;
  url: string;
  location?: string;
}

/**
 * Fetch a URL and extract job listing links from the HTML.
 * Uses common patterns found on Greenhouse, Lever, Workday, and custom career pages.
 */
export async function scrapeJobLinks(
  filteredUrl: string,
): Promise<{ jobs: ScrapedJob[]; latency_ms: number }> {
  const start = Date.now();

  const res = await fetch(filteredUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    console.warn(`[scraper] Failed to fetch ${filteredUrl}: ${res.status}`);
    return { jobs: [], latency_ms: Date.now() - start };
  }

  const html = await res.text();
  const jobs = parseJobLinks(html, filteredUrl);
  return { jobs, latency_ms: Date.now() - start };
}

/**
 * Parse HTML for job listing links using regex patterns.
 * Targets the most common ATS platforms + generic patterns.
 */
function parseJobLinks(html: string, baseUrl: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seenUrls = new Set<string>();

  // Pattern 1: Greenhouse (job-boards.greenhouse.io)
  const greenhousePattern =
    /<a[^>]+href="(https:\/\/[^"]*greenhouse\.io\/[^"]*\/jobs\/\d+[^"]*)"\s*[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(greenhousePattern)) {
    const url = match[1];
    const title = stripHtml(match[2]).trim();
    if (title && !seenUrls.has(url)) {
      seenUrls.add(url);
      jobs.push({ title, url });
    }
  }

  // Pattern 2: Lever (jobs.lever.co)
  const leverPattern =
    /<a[^>]+href="(https:\/\/jobs\.lever\.co\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(leverPattern)) {
    const url = match[1];
    const title = stripHtml(match[2]).trim();
    if (title && !seenUrls.has(url)) {
      seenUrls.add(url);
      jobs.push({ title, url });
    }
  }

  // Pattern 3: Generic job links — anchors whose href contains /jobs/ or /positions/
  // and whose text looks like a job title (not navigation)
  const genericPattern =
    /<a[^>]+href="([^"]*(?:\/jobs\/|\/positions\/|\/job\/|\/opening\/)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(genericPattern)) {
    const rawUrl = match[1];
    const url = rawUrl.startsWith("http")
      ? rawUrl
      : new URL(rawUrl, baseUrl).href;
    const title = stripHtml(match[2]).trim();
    if (title && title.length > 3 && title.length < 200 && !seenUrls.has(url)) {
      seenUrls.add(url);
      jobs.push({ title, url });
    }
  }

  return jobs;
}

/** Strip HTML tags and decode common entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
