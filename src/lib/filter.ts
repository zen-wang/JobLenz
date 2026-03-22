import type { FilterStats } from "./types";
import type { UserProfile } from "./profile-types";

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
  jobs: { title: string; url: string; location?: string; company?: string }[],
  roleQuery: string,
  userProfile?: UserProfile | null,
): { jobs: typeof jobs; stats: FilterStats } {
  // Build query words from roleQuery + profile's target_role if different
  const queryParts = [roleQuery];
  if (
    userProfile?.experience.target_role &&
    userProfile.experience.target_role.toLowerCase() !== roleQuery.toLowerCase()
  ) {
    queryParts.push(userProfile.experience.target_role);
  }

  const queryWords = queryParts
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  // Build extra keyword set from profile skills for title matching
  const profileKeywords = userProfile?.skills_boundary
    ? [
        ...userProfile.skills_boundary.programming_languages,
        ...userProfile.skills_boundary.frameworks,
      ]
        .map((s) => s.toLowerCase())
        .filter((s) => s.length > 2)
    : [];

  const minMatch = queryWords.length < 2 ? 1 : 2;

  const filtered = jobs.filter((job) => {
    const titleLower = job.title.toLowerCase();

    // Check query word matches
    const matchCount = queryWords.filter((w) => titleLower.includes(w)).length;
    if (matchCount >= minMatch) return true;

    // Check related titles
    if (RELATED_TITLES.some((rt) => titleLower.includes(rt))) return true;

    // Check profile skill keywords in title (e.g. "PyTorch" in "PyTorch Engineer")
    if (profileKeywords.some((pk) => titleLower.includes(pk))) return true;

    return false;
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
