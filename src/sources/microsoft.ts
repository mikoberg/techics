import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { scrapeArticle } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const BUILD_EVENT_PAGE_URL = "https://build.microsoft.com/";

// build.microsoft.com's og:description carries the confirmed date directly
// (confirmed live: "...at Microsoft Build, June 2–3, 2026, in San Francisco
// and online.") — the same meta tag doubles as both the date source and
// the fallback description text.
const EVENT_PAGE_CONFIG = {
  titleSelector: 'meta[property="og:title"]',
  titleAttr: "content",
  dateSelector: 'meta[property="og:description"]',
  dateAttr: "content",
  descriptionSelector: 'meta[property="og:description"]',
  descriptionAttr: "content",
};

const BUILD_KEYWORDS = [/\bMicrosoft Build\b/i];

/**
 * Official source: build.microsoft.com's own event landing page (confirmed
 * live: server-rendered, no JS required — the date is present as plain
 * text in a meta tag). This replaces the previous approach of mining
 * Microsoft's general corporate press feed for incidental "Build" mentions,
 * which only surfaced Build after the general press cycle picked it up,
 * often well after Microsoft's own event site already had the confirmed
 * date. Same conservative contract as every other source: if the page's
 * structure changes or no confident date can be extracted (e.g. between
 * cycles, before next year's dates are announced), this returns zero
 * events rather than guessing — add confirmed dates to data/manual.json
 * in the meantime.
 */
export class MicrosoftSource implements EventSource {
  readonly displayName = "Microsoft";
  // Verified live: og:description extraction produced the real confirmed
  // Build 2026 date directly from build.microsoft.com.
  readonly maturity = "production";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const html = await fetchText(BUILD_EVENT_PAGE_URL);
      const page = scrapeArticle(html, EVENT_PAGE_CONFIG);
      if (!page || !matchesLaunchTitle(page.title, BUILD_KEYWORDS)) return [];

      const start = extractConfidentDate(page.dateText, new Date());
      if (!start) {
        console.info(
          "[MicrosoftSource] No confident date found on the Build event page. Add to manual.json if confirmed.",
        );
        return [];
      }

      const description = getCuratedDescription(page.title) ?? page.description;
      const title = getCanonicalTitle(page.title, start) ?? page.title;

      return [
        {
          id: generateEventId("microsoft", page.title, start),
          title,
          ...(description ? { description } : {}),
          start,
          url: BUILD_EVENT_PAGE_URL,
          category: "microsoft",
          importance: "major",
          company: "Microsoft",
          sourceType: "official-scrape",
          discoveryMethod: "event_page",
          allDay: true,
        },
      ];
    } catch (error) {
      console.warn(`[MicrosoftSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
