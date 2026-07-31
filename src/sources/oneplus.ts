import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";

/**
 * LIMITATION: no official, stable RSS/Atom feed or structured events page
 * was found for OnePlus (oneplus.com) at the time of writing — only
 * third-party press-release distributors surface their announcements.
 * Per the reliability-over-automation policy, we do not scrape their
 * marketing site's HTML, since that is likely to break silently on
 * redesign. This source intentionally returns no events; add confirmed
 * OnePlus launch event dates to data/manual.json.
 */
export class OnePlusSource implements EventSource {
  readonly displayName = "OnePlus";

  async fetchEvents(): Promise<TechEvent[]> {
    return [];
  }
}
