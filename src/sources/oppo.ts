import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: investigated and ruled out, not just "no RSS". OPPO's
 * newsroom (oppo.com/en/newsroom/press/) was fetched directly and its
 * server-rendered HTML contains no article content at all — the page is
 * a client-side app shell that populates news via JavaScript after load.
 * There is nothing to scrape without running a full browser, which is
 * exactly the fragility the reliability-over-automation policy rules
 * out. This source intentionally returns no events; add confirmed OPPO
 * launch events (flagships, foldables, tablets, smartwatches, major
 * software announcements) to data/manual.json.
 */
export class OppoSource implements EventSource {
  readonly displayName = "Oppo";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
