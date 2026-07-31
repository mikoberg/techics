import type { TechEvent } from "../models/TechEvent.js";
import { generateEventId } from "./hash.js";

/**
 * Collapses events to one-per-unique-ID. IDs are regenerated (not trusted
 * from the input) so a source with drifted ID logic can't slip past dedupe.
 * When two events share an ID, the one encountered first wins — callers
 * should order manual/authoritative-source events before stub-source
 * events so manual entries take precedence.
 */
export function dedupeEvents(events: TechEvent[]): TechEvent[] {
  const seen = new Map<string, TechEvent>();
  for (const event of events) {
    const id = generateEventId(event.category, event.title, event.start);
    if (!seen.has(id)) {
      seen.set(id, { ...event, id });
    }
  }
  return Array.from(seen.values());
}
