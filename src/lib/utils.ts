/** Extract a clean domain from a URL or hostname string. */
export function extractDomain(input: string): string {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    // Fallback: treat the whole input as a domain
    return input.replace(/^www\./, "").split("/")[0];
  }
}

/** Derive a company name from a domain (capitalize, drop TLD). */
export function domainToCompanyName(domain: string): string {
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Slugify a string for use in filenames. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
}

/** Download a string as a file via Blob. */
export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Normalise a company URL into a careers-page URL if needed. */
export function normalizeCareersUrl(input: string): string {
  const url = input.startsWith("http") ? input : `https://${input}`;
  // If the URL already mentions careers/jobs, use as-is
  if (/careers|jobs/i.test(url)) {
    return url;
  }
  // Otherwise append /careers as a best-effort guess
  return url.replace(/\/+$/, "") + "/careers";
}
