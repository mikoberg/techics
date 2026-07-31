import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: investigated and ruled out, not just "no RSS". Xiaomi's
 * newsroom (mi.com/global/discover/newsroom) was fetched directly —
 * confirmed live to return only ~42KB of nav/skeleton markup with zero
 * article content and no embedded JSON; the actual news list is loaded
 * client-side via JavaScript after the page loads. There is nothing to
 * scrape without running a full browser, which is exactly the fragility
 * the reliability-over-automation policy rules out. This source
 * intentionally returns no events; add confirmed Xiaomi launch events
 * (flagships, foldables, tablets, smartwatches, major software
 * announcements) to data/manual.json.
 */
export class XiaomiSource implements EventSource {
  readonly displayName = "Xiaomi";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
