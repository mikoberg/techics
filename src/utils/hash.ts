import { createHash } from "node:crypto";

/**
 * Deterministic ID generator: the same logical event (same category,
 * title, and calendar day) always produces the same ID, run after run,
 * regardless of description/URL/time-of-day edits. This is what lets
 * dedupe and re-generation stay stable across builds.
 */
export function generateEventId(category: string, title: string, start: Date): string {
  const normalizedTitle = title.trim().toLowerCase();
  const day = start.toISOString().slice(0, 10); // YYYY-MM-DD, ignores time/zone jitter
  const key = `${category}|${normalizedTitle}|${day}`;
  const digest = createHash("sha1").update(key).digest("hex").slice(0, 16);
  return `${category}-${digest}`;
}
