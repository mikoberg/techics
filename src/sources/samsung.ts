import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { scrapeArticle } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const UNPACKED_EVENT_PAGE_URL = "https://www.samsung.com/us/unpacked/";

// Samsung's own reservation page carries a countdown widget with a
// machine-readable `data-end-time` attribute (confirmed live:
// data-end-time="2026-08-07T03:00:00Z-0400") — more reliable than parsing
// prose, same technique as OPPO's data-detail-date. The og:title/
// description are generic "reserve your spot" marketing copy, not a
// specific product name, so the real title/description come from
// getCanonicalTitle/getCuratedDescription once the date is known.
const EVENT_PAGE_CONFIG = {
  titleSelector: 'meta[property="og:title"]',
  titleAttr: "content",
  dateSelector: ".hd-kv-carousel__countdown",
  dateAttr: "data-end-time",
  descriptionSelector: 'meta[property="og:description"]',
  descriptionAttr: "content",
};

const UNPACKED_KEYWORDS = [/\bunpacked\b/i];

/**
 * Official source: samsung.com/us/unpacked/, Samsung's own Unpacked
 * reservation landing page (confirmed live: server-rendered, no JS
 * required). This replaces Samsung Newsroom's RSS feed, whose Unpacked
 * coverage — per the previous version of this file — clusters
 * around/after the event (recap articles) rather than giving advance
 * notice. This page is evergreen: when no Unpacked event is imminent, its
 * countdown widget's `data-end-time` won't parse into a confident date and
 * this source correctly returns zero events, same conservative contract
 * as every other source — add confirmed upcoming Unpacked dates to
 * data/manual.json as soon as Samsung's own invite goes out if this page
 * hasn't updated yet.
 */
export class SamsungSource implements EventSource {
  readonly displayName = "Samsung";
  // Verified live: the countdown-widget extraction produced a genuine
  // forward-looking date (Aug 7, 2026, 6 days out) directly from
  // Samsung's own page during this implementation's verification pass.
  readonly maturity = "production";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const html = await fetchText(UNPACKED_EVENT_PAGE_URL);
      const page = scrapeArticle(html, EVENT_PAGE_CONFIG);
      if (!page || !matchesLaunchTitle(page.title, UNPACKED_KEYWORDS)) return [];

      const start = extractConfidentDate(page.dateText, new Date());
      if (!start) {
        console.info(
          "[SamsungSource] No confident date found on the Unpacked event page. Add to manual.json if confirmed.",
        );
        return [];
      }

      const description = getCuratedDescription(page.title) ?? page.description;
      const title = getCanonicalTitle(page.title, start) ?? page.title;

      return [
        {
          id: generateEventId("hardware", page.title, start),
          title,
          ...(description ? { description } : {}),
          start,
          url: UNPACKED_EVENT_PAGE_URL,
          // Same page as `url` — this source's URL already is the official
          // event page, the best possible watch-on-the-day destination.
          watchUrl: UNPACKED_EVENT_PAGE_URL,
          category: "hardware",
          importance: "major",
          company: "Samsung",
          sourceType: "official-scrape",
          discoveryMethod: "event_page",
          allDay: true,
        },
      ];
    } catch (error) {
      console.warn(`[SamsungSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
