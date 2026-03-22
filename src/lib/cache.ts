import { createHash } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");

/** In-memory cache layer (lives for the lifetime of the server process). */
const memoryCache = new Map<string, unknown>();

/** Generate a deterministic cache key from url + goal text. */
export function cacheKey(url: string, goal: string): string {
  return createHash("sha256").update(`${url}|${goal}`).digest("hex");
}

/** Look up a cached result — checks memory first, then disk. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Memory
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  // 2. Disk
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as T;
    memoryCache.set(key, parsed); // promote to memory
    return parsed;
  } catch {
    return null;
  }
}

/** Store a result in both memory and disk cache. */
export async function cacheSet(key: string, data: unknown): Promise<void> {
  memoryCache.set(key, data);

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[cache] Failed to write ${key} to disk:`, err);
  }
}

/** Seed the file cache from a pre-built JSON file (used for demo data). */
export async function seedCache(
  url: string,
  goal: string,
  data: unknown,
): Promise<string> {
  const key = cacheKey(url, goal);
  await cacheSet(key, data);
  return key;
}
