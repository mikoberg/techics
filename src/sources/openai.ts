import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseFeed } from "../utils/feedParser.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";

const OPENAI_NEWS_FEED = "https://openai.com/news/rss.xml";

const DEVDAY_KEYWORDS = [/\bDevDay\b/i];

/**
 * Official source: OpenAI's news RSS feed (confirmed live at time of
 * writing), filtered for DevDay announcements/coverage.
 */
export class OpenAiSource implements EventSource {
  readonly displayName = "OpenAI";
  // Experimental: relies on OpenAI historically publishing a forward
  // "Announcing DevDay {year}" post ahead of the event, which is sound
  // evidence but hasn't been verified against a complete real DevDay
  // announcement cycle end-to-end in this project.
  readonly maturity = "experimental";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const xml = await fetchText(OPENAI_NEWS_FEED);
      const items = parseFeed(xml).filter((item) => matchesLaunchTitle(item.title, DEVDAY_KEYWORDS));

      const events: TechEvent[] = [];
      for (const item of items) {
        const start = extractConfidentDate(`${item.title} ${item.description}`, item.publishedAt);
        if (!start) {
          console.info(
            `[OpenAiSource] Skipping "${item.title}" — no confident date found. Add to manual.json if confirmed.`,
          );
          continue;
        }

        const description = getCuratedDescription(item.title) ?? item.description;
        const title = getCanonicalTitle(item.title, start) ?? item.title;

        events.push({
          id: generateEventId("ai", item.title, start),
          title,
          ...(description ? { description } : {}),
          start,
          url: item.link,
          category: "ai",
          importance: "major",
          company: "OpenAI",
          sourceType: "official-feed",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[OpenAiSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
