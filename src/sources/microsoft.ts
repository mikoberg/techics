import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseFeed } from "../utils/feedParser.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription } from "../utils/curatedDescriptions.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";

const MICROSOFT_NEWS_FEED = "https://news.microsoft.com/feed/";

const BUILD_KEYWORDS = [/\bMicrosoft Build\b/i];

/**
 * Official source: news.microsoft.com's RSS feed (confirmed live at time
 * of writing). This is Microsoft's general corporate press feed (earnings,
 * CSR, partnerships) — no dedicated Build-announcement feed exists, so
 * this is a best-effort filter for "Microsoft Build" mentions. Low signal
 * is expected; add confirmed Build dates to data/manual.json as soon as
 * Microsoft announces them (typically on build.microsoft.com directly,
 * which this source does not scrape).
 */
export class MicrosoftSource implements EventSource {
  readonly displayName = "Microsoft";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const xml = await fetchText(MICROSOFT_NEWS_FEED);
      const items = parseFeed(xml).filter((item) => matchesLaunchTitle(item.title, BUILD_KEYWORDS));

      const events: TechEvent[] = [];
      for (const item of items) {
        const start = extractConfidentDate(`${item.title} ${item.description}`, item.publishedAt);
        if (!start) {
          console.info(
            `[MicrosoftSource] Skipping "${item.title}" — no confident date found. Add to manual.json if confirmed.`,
          );
          continue;
        }

        const description = getCuratedDescription(item.title) ?? item.description;

        events.push({
          id: generateEventId("microsoft", item.title, start),
          title: item.title,
          ...(description ? { description } : {}),
          start,
          url: item.link,
          category: "microsoft",
          importance: "major",
          company: "Microsoft",
          sourceType: "official-feed",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[MicrosoftSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
