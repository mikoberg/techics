import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { scrapeNewsroom } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const HONOR_NEWS_URL = "https://www.honor.com/global/news/archive/";

const SCRAPER_CONFIG = {
  baseUrl: "https://www.honor.com",
  itemSelector: ".news-container",
  titleSelector: ".news-title",
  linkSelector: "a",
  dateSelector: ".news-time.news-pc",
  descriptionSelector: ".news-description",
};

// HONOR's flagship lines are Magic (phones) and Magic V/Pad (foldables/tablets).
// The combined launch+series/flagship/foldable pattern catches numbered-series
// launches (e.g. "HONOR Launches the HONOR 600 Series...Flagship...") without
// also matching unrelated "launched" marketing copy that lacks those nouns
// (e.g. "HONOR Magic Stories Awards...Officially Launched").
const INCLUDE_PATTERNS = [
  /\bmagic\s?\d/i,
  /\bmagic\s?v\d/i,
  /\bmagic\s?pad\b/i,
  /\bglobal launch\b/i,
  /\blaunch(?:es|ed)?\b.*\b(?:series|flagship|foldable)\b/i,
];

/**
 * Official source: HONOR's global news archive (server-rendered HTML,
 * confirmed live at time of writing — honor.com/global/news/ itself is
 * client-rendered with no article content, but /archive/ is not).
 * Scraped with stable CSS selectors via src/utils/htmlScraper.ts, then
 * filtered to launch-shaped titles only (Magic-series phones/foldables,
 * "global launch") — availability, sales, campaigns, and other marketing
 * posts that also appear in this feed are excluded by
 * src/utils/titleFilter.ts. A site redesign that breaks these selectors
 * degrades to zero events, never a crash or a fabricated one.
 */
export class HonorSource implements EventSource {
  readonly displayName = "Honor";
  // Verified live against real launch cycles (Magic V6, Magic8 Pro, etc.)
  // — selectors and include/exclude patterns confirmed against genuine
  // observed newsroom content.
  readonly maturity = "production";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const html = await fetchText(HONOR_NEWS_URL);
      const articles = scrapeNewsroom(html, SCRAPER_CONFIG);

      const events: TechEvent[] = [];
      for (const article of articles) {
        if (!matchesLaunchTitle(article.title, INCLUDE_PATTERNS)) continue;

        const start = extractConfidentDate(article.dateText, new Date());
        if (!start) {
          console.info(
            `[HonorSource] Skipping "${article.title}" — no confident date found. Add to manual.json if confirmed.`,
          );
          continue;
        }

        const description = getCuratedDescription(article.title) ?? article.description;
        const title = getCanonicalTitle(article.title, start) ?? article.title;

        events.push({
          id: generateEventId("hardware", article.title, start),
          title,
          ...(description ? { description } : {}),
          start,
          url: article.url,
          category: "hardware",
          importance: "major",
          company: "HONOR",
          sourceType: "official-scrape",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[HonorSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
