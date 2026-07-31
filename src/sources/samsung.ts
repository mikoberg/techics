import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseFeed } from "../utils/feedParser.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription } from "../utils/curatedDescriptions.js";

const SAMSUNG_NEWSROOM_FEED = "https://news.samsung.com/global/feed";

const UNPACKED_KEYWORDS = /\bunpacked\b/i;

/**
 * Official source: Samsung Global Newsroom's RSS feed (confirmed live at
 * time of writing), filtered for Galaxy Unpacked coverage. Caveat: this
 * feed's Unpacked coverage tends to cluster around/after the event
 * (recap articles, interviews) rather than announcing the date months in
 * advance, so it is good at confirming an event occurred but less
 * reliable for early advance notice — add confirmed upcoming Unpacked
 * dates to data/manual.json as soon as Samsung's own invite goes out.
 */
export class SamsungSource implements EventSource {
  readonly displayName = "Samsung";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const xml = await fetchText(SAMSUNG_NEWSROOM_FEED);
      const items = parseFeed(xml).filter((item) => UNPACKED_KEYWORDS.test(item.title));

      const events: TechEvent[] = [];
      for (const item of items) {
        const start = extractConfidentDate(`${item.title} ${item.description}`, item.publishedAt);
        if (!start) {
          console.info(
            `[SamsungSource] Skipping "${item.title}" — no confident date found. Add to manual.json if confirmed.`,
          );
          continue;
        }

        const description = getCuratedDescription(item.title) ?? item.description;

        events.push({
          id: generateEventId("hardware", item.title, start),
          title: item.title,
          ...(description ? { description } : {}),
          start,
          url: item.link,
          category: "hardware",
          importance: "major",
          company: "Samsung",
          sourceType: "official-feed",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[SamsungSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
