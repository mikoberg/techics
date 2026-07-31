import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: investigated and ruled out, not just "no RSS". Sony's
 * corporate news page (sony.net/corporate/information/news/) was fetched
 * directly and is a client-side filter UI with no static article content
 * — and it's Sony-wide, not Xperia-specific, even if it were scrapable.
 * Several plausible Xperia-specific press page URLs were also fetched
 * directly and returned 404/403. No reachable official page exists to
 * scrape. This source intentionally returns no events; add confirmed
 * Sony Xperia launch events (flagships, foldables, tablets, smartwatches,
 * major software announcements) to data/manual.json.
 */
export class SonySource implements EventSource {
  readonly displayName = "Sony Xperia";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
