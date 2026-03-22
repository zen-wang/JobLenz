import type { FilterStats } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "in", "on", "at", "to", "of",
  "is", "are", "was", "with", "as", "by", "from", "that", "this",
]);

const RELATED_TITLES = [
  "ml",
  "ai",
  "data scientist",
  "research engineer",
  "software engineer",
  "machine learning",
  "deep learning",
  "nlp",
  "computer vision",
];

export function filterJobsByRelevance(
  jobs: { title: string; url: string; location?: string }[],
  roleQuery: string,
): { jobs: typeof jobs; stats: FilterStats } {
  const queryWords = roleQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const minMatch = queryWords.length < 2 ? 1 : 2;

  const filtered = jobs.filter((job) => {
    const titleLower = job.title.toLowerCase();

    // Check query word matches
    const matchCount = queryWords.filter((w) => titleLower.includes(w)).length;
    if (matchCount >= minMatch) return true;

    // Check related titles
    return RELATED_TITLES.some((rt) => titleLower.includes(rt));
  });

  return {
    jobs: filtered,
    stats: {
      total_raw: jobs.length,
      total_filtered: filtered.length,
      removed_count: jobs.length - filtered.length,
    },
  };
}
