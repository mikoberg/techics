import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseFeed } from "../utils/feedParser.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription } from "../utils/curatedDescriptions.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";

const APPLE_NEWSROOM_FEED = "https://www.apple.com/newsroom/rss-feed.rss";

// Matches newsroom posts announcing/covering Apple's keynote-style events.
// WWDC and the (unofficially named) "September"/"October" hardware events
// are the only ones the user asked us to collect; general product press
// releases are deliberately excluded by this pattern.
const EVENT_KEYWORDS = [/\bWWDC\d*\b|special event|keynote/i];

/**
 * Official source: Apple Newsroom's RSS feed (confirmed live at time of
 * writing). This is Apple's general company newsroom, not a
 * dedicated events feed, so we filter for keynote-style announcements and
 * only emit an event when an explicit date can be extracted from the
 * article text — otherwise we skip it rather than guess. Advance notice
 * of WWDC/September/October events should still be added to
 * data/manual.json as soon as Apple sends media invites, since Apple
 * often does not publish a newsroom article until the event itself.
 */
export class AppleSource implements EventSource {
  readonly displayName = "Apple";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const xml = await fetchText(APPLE_NEWSROOM_FEED);
      const items = parseFeed(xml).filter((item) => matchesLaunchTitle(item.title, EVENT_KEYWORDS));

      const events: TechEvent[] = [];
      for (const item of items) {
        const start = extractConfidentDate(`${item.title} ${item.description}`, item.publishedAt);
        if (!start) {
          console.info(
            `[AppleSource] Skipping "${item.title}" — no confident date found. Add to manual.json if confirmed.`,
          );
          continue;
        }

        const description = getCuratedDescription(item.title) ?? item.description;

        events.push({
          id: generateEventId("apple", item.title, start),
          title: item.title,
          ...(description ? { description } : {}),
          start,
          url: item.link,
          category: "apple",
          importance: "major",
          company: "Apple",
          sourceType: "official-feed",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[AppleSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
