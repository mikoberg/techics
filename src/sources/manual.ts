import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { EventSource } from "./EventSource.js";
import type { ManualEventInput, TechEvent } from "../models/TechEvent.js";
import { VALID_CATEGORIES, VALID_IMPORTANCE } from "../models/TechEvent.js";
import { generateEventId } from "../utils/hash.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANUAL_JSON_PATH = path.resolve(__dirname, "../../data/manual.json");

/**
 * Loads and maps data/manual.json. This is the primary, authoritative
 * data source for the calendar — overriding/supplementing every stub
 * vendor source. Unlike the stub sources, malformed data here throws
 * loudly rather than being swallowed, since silent failure in the real
 * data source would be far more dangerous than a crashed build.
 */
export class ManualSource implements EventSource {
  // Human-curated, not an extraction mechanism to verify — always production.
  readonly maturity = "production";

  constructor(private readonly filePath: string = DEFAULT_MANUAL_JSON_PATH) {}

  async fetchEvents(): Promise<TechEvent[]> {
    const raw = await readFile(this.filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid manual.json: expected an array, got ${typeof parsed}`);
    }

    const events: TechEvent[] = [];
    parsed.forEach((entry, index) => {
      if (!isManualEventInput(entry)) {
        throw new Error(`Invalid manual.json entry at index ${index}: ${JSON.stringify(entry)}`);
      }

      if (!entry.confirmed) {
        console.info(`Skipped unconfirmed manual event. ("${entry.title}")`);
        return;
      }

      events.push(mapEntry(entry, index));
    });

    return events;
  }
}

function mapEntry(entry: ManualEventInput, index: number): TechEvent {
  const start = new Date(entry.date);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid manual.json entry at index ${index}: unparseable date "${entry.date}"`);
  }

  let end: Date | undefined;
  if (entry.endDate !== undefined) {
    end = new Date(entry.endDate);
    if (Number.isNaN(end.getTime())) {
      throw new Error(
        `Invalid manual.json entry at index ${index}: unparseable endDate "${entry.endDate}"`,
      );
    }
  }

  const importance = entry.importance ?? "normal";
  // A bare date ("2027-08-18", no "T...") means only the day is known —
  // emit as an all-day event rather than fabricating a midnight time.
  const allDay = !entry.date.includes("T");

  return {
    id: generateEventId(entry.category, entry.title, start),
    title: entry.title,
    ...(entry.description !== undefined ? { description: entry.description } : {}),
    start,
    ...(end !== undefined ? { end } : {}),
    ...(entry.location !== undefined ? { location: entry.location } : {}),
    ...(entry.url !== undefined ? { url: entry.url } : {}),
    category: entry.category,
    importance,
    ...(entry.company !== undefined ? { company: entry.company } : {}),
    sourceType: "manual",
    discoveryMethod: "manual",
    ...(allDay ? { allDay: true } : {}),
  };
}

export function isManualEventInput(value: unknown): value is ManualEventInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.title !== "string" || v.title.trim().length === 0) return false;
  if (typeof v.date !== "string") return false;
  if (v.endDate !== undefined && typeof v.endDate !== "string") return false;
  if (v.description !== undefined && typeof v.description !== "string") return false;
  if (v.url !== undefined && typeof v.url !== "string") return false;
  if (v.location !== undefined && typeof v.location !== "string") return false;
  if (v.company !== undefined && typeof v.company !== "string") return false;
  if (typeof v.category !== "string" || !VALID_CATEGORIES.includes(v.category as never)) {
    return false;
  }
  if (v.importance !== undefined && !VALID_IMPORTANCE.includes(v.importance as never)) {
    return false;
  }
  if (typeof v.confirmed !== "boolean") return false;

  return true;
}
