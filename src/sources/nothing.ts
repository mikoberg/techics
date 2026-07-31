import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: no official, stable RSS/Atom feed or structured events page
 * was found for Nothing (nothing.tech) at the time of writing — only
 * third-party news aggregators surface their announcements. Per the
 * reliability-over-automation policy, we do not scrape their marketing
 * site's HTML, since that is likely to break silently on redesign. This
 * source intentionally returns no events; add confirmed Nothing launch
 * event dates to data/manual.json.
 */
export class NothingSource implements EventSource {
  readonly displayName = "Nothing";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
