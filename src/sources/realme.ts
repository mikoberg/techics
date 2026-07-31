import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: investigated and ruled out, not just "no RSS". Several
 * plausible official newsroom URLs (realme.com/global/news,
 * /global/newsroom, /en-in/news) were fetched directly and all returned
 * 403/404 — no reachable official newsroom page was found to scrape at
 * all, let alone a feed. This source intentionally returns no events;
 * add confirmed realme launch events (flagships, foldables, tablets,
 * smartwatches, major software announcements) to data/manual.json.
 */
export class RealmeSource implements EventSource {
  readonly displayName = "Realme";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
