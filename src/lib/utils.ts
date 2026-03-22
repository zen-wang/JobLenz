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
