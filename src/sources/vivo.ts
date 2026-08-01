import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { scrapeNewsroom } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const VIVO_NEWSROOM_URL = "https://vivonewsroom.in/press-releases/";

// Each press item is a div.content wrapping an `a.press-title` (title +
// href) and a sibling `a.press-rm-btn` (date text) — qualifying the
// selector with :has() keeps it specific despite "content" being a
// generic class name elsewhere on the page.
const SCRAPER_CONFIG = {
  baseUrl: "https://vivonewsroom.in",
  itemSelector: "div.content:has(a.press-title)",
  titleSelector: "a.press-title h4",
  linkSelector: "a.press-title",
  dateSelector: "a.press-rm-btn",
};

// vivo's flagship/foldable lines: X-series (e.g. X300), X Fold.
const INCLUDE_PATTERNS = [/\bx\d{3}\b/i, /\bx fold\b/i, /\bunveils\b/i, /\bdebuts\b/i, /\bglobal launch\b/i];

/**
 * Official source: vivo's press-release newsroom (server-rendered HTML,
 * confirmed live at time of writing). This is vivo's India newsroom —
 * the only public vivo newsroom found with real article content — so
 * global launches not covered there should still be added to
 * data/manual.json. Scraped with stable CSS selectors via
 * src/utils/htmlScraper.ts, then filtered to launch-shaped titles only
 * (X-series flagships, X Fold). The same feed mixes in sales/variant/CSR
 * posts (confirmed live: "...Goes On Sale With Exciting Launch Offers",
 * "...Fusion Red Variant...", "vivo Ignite 2026...") which
 * src/utils/titleFilter.ts's exclude patterns correctly reject even when
 * they also mention a flagship name. A site redesign that breaks these
 * selectors degrades to zero events, never a crash or a fabricated one.
 */
export class VivoSource implements EventSource {
  readonly displayName = "Vivo";
  // Verified live against real launch cycles (X300 FE, X300 Ultra, etc.)
  // — selectors and include/exclude patterns confirmed against genuine
  // observed newsroom content.
  readonly maturity = "production";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const html = await fetchText(VIVO_NEWSROOM_URL);
      const articles = scrapeNewsroom(html, SCRAPER_CONFIG);

      const events: TechEvent[] = [];
      for (const article of articles) {
        if (!matchesLaunchTitle(article.title, INCLUDE_PATTERNS)) continue;

        const start = extractConfidentDate(article.dateText, new Date());
        if (!start) {
          console.info(
            `[VivoSource] Skipping "${article.title}" — no confident date found. Add to manual.json if confirmed.`,
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
          // No dedicated event page exists for vivo launches — the
          // announcement article is the best available watch destination.
          watchUrl: article.url,
          category: "hardware",
          importance: "major",
          company: "vivo",
          sourceType: "official-scrape",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[VivoSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
