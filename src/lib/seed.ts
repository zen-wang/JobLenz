import { readFile } from "fs/promises";
import path from "path";
import { cacheKey, cacheSet } from "./cache";
import {
  buildScoutGoal,
  buildJDExtractionGoal,
  buildH1BGoal,
  buildValuesGoal,
  buildSalaryGoal,
} from "./agents";

interface SeedEntry {
  file: string;
  url: string;
  goalBuilder: () => string;
}

/**
 * Known seed entries: each maps a JSON file to the (url, goal) pair
 * that produces the matching cache key.
 */
const SEED_ENTRIES: SeedEntry[] = [
  // Anthropic
  {
    file: "anthropic-scout.json",
    url: "https://anthropic.com/careers",
    goalBuilder: () => buildScoutGoal("machine learning engineer"),
  },
  {
    file: "anthropic-jd-4952079008.json",
    url: "https://job-boards.greenhouse.io/anthropic/jobs/4952079008",
    goalBuilder: buildJDExtractionGoal,
  },
  // Spotify
  {
    file: "spotify-scout.json",
    url: "https://www.lifeatspotify.com/jobs",
    goalBuilder: () => buildScoutGoal("machine learning"),
  },
  // Adobe
  {
    file: "adobe-scout.json",
    url: "https://careers.adobe.com",
    goalBuilder: () => buildScoutGoal("machine learning"),
  },
];

let seeded = false;

/**
 * Load all pre-cached JSON files from data/cache/ into the runtime cache.
 * Runs once per server process.
 */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const cacheDir = path.join(process.cwd(), "data", "cache");

  for (const entry of SEED_ENTRIES) {
    try {
      const filePath = path.join(cacheDir, entry.file);
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw);
      const goal = entry.goalBuilder();
      const key = cacheKey(entry.url, goal);
      await cacheSet(key, data);
      console.log(`[seed] Loaded ${entry.file} → key ${key.slice(0, 12)}…`);
    } catch (err) {
      console.warn(`[seed] Could not load ${entry.file}:`, err);
    }
  }
}
