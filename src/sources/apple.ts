import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { scrapeArticle } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const APPLE_EVENTS_PAGE_URL = "https://www.apple.com/apple-events/";

// The hero section's headline ("WWDC26") plus its body copy is combined
// into one text blob for date extraction — confirmed live, the hero
// currently reads as a *recap* of the most recent keynote (marked with a
// "post-event-body" class, callout text "Coming later this year", no
// explicit date), which correctly yields no confident date via
// extractConfidentDate's existing "vague text -> undefined" behavior. Per
// Apple's own class-naming symmetry ("post-event-*"), the same hero
// section is expected to carry an explicit date once Apple posts a
// genuine pre-event invite ahead of the next keynote — that state wasn't
// observed live (no event was imminent at time of writing), so this is a
// best-effort inference, not a directly confirmed selector; if it doesn't
// hold, this degrades to zero events, same as every other source's
// contract, never a crash or a guess.
const EVENT_PAGE_CONFIG = {
  titleSelector: ".section-hero .hero-headline",
  dateSelector: ".section-hero .copy-container",
  descriptionSelector: ".section-hero .hero-copy",
};

// Matches keynote-style events only; general product press coverage
// (which this page also links out to via "Here's what we announced") is
// deliberately out of scope.
const EVENT_KEYWORDS = [/\bWWDC\d*\b|special event|keynote/i];

/**
 * Official source: apple.com/apple-events/, Apple's own event landing page
 * (confirmed live: server-rendered, no JS required). This replaces
 * Apple Newsroom's RSS feed, which — per the previous version of this
 * file — often doesn't publish an article until the event itself. This
 * page is Apple's dedicated hub for keynote-style events and is expected
 * to carry the confirmed date as soon as Apple sends media invites,
 * ahead of any newsroom article. Same conservative contract as every
 * other source: no confident date on the page (the common case between
 * keynotes) means zero events, not a guess — add confirmed WWDC/September/
 * October dates to data/manual.json as soon as Apple announces them if
 * this page hasn't reflected it yet.
 */
export class AppleSource implements EventSource {
  readonly displayName = "Apple";
  // Experimental: the hero-section selectors are inferred from Apple's
  // own "post-event" class naming, not confirmed against a real pre-event
  // invite (none was live at time of writing) — not yet verified through
  // a complete announcement cycle. See README.md's "Source maturity" section.
  readonly maturity = "experimental";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const html = await fetchText(APPLE_EVENTS_PAGE_URL);
      const page = scrapeArticle(html, EVENT_PAGE_CONFIG);
      if (!page || !matchesLaunchTitle(page.title, EVENT_KEYWORDS)) return [];

      const start = extractConfidentDate(page.dateText, new Date());
      if (!start) {
        console.info(
          "[AppleSource] No confident date found on the Apple Events page. Add to manual.json if confirmed.",
        );
        return [];
      }

      const description = getCuratedDescription(page.title) ?? page.description;
      const title = getCanonicalTitle(page.title, start) ?? page.title;

      return [
        {
          id: generateEventId("apple", page.title, start),
          title,
          ...(description ? { description } : {}),
          start,
          url: APPLE_EVENTS_PAGE_URL,
          // Same page as `url` — this source's URL already is the official
          // event page, the best possible watch-on-the-day destination.
          watchUrl: APPLE_EVENTS_PAGE_URL,
          category: "apple",
          importance: "major",
          company: "Apple",
          sourceType: "official-scrape",
          discoveryMethod: "event_page",
          allDay: true,
        },
      ];
    } catch (error) {
      console.warn(`[AppleSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
