import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseSitemapUrls } from "../utils/sitemap.js";
import { scrapeArticle } from "../utils/htmlScraper.js";
import { matchesLaunchTitle } from "../utils/titleFilter.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription, getCanonicalTitle } from "../utils/curatedDescriptions.js";

const OPPO_SITEMAP_URL = "https://www.oppo.com/en/sitemap.xml";

// OPPO's newsroom *listing* page is a client-rendered shell with no
// article content — confirmed by direct investigation, not just "no RSS
// found" — so there is nothing to scrape there. Individual article pages
// are, however, fully server-rendered, and the sitemap reliably enumerates
// them. `data-detail-date` is a machine-readable ISO-ish date attribute
// (confirmed live: `data-detail-date="2023-08-29 00:00:00"`), far more
// reliable than the sitemap's own untrustworthy <lastmod>.
const ARTICLE_SCRAPER_CONFIG = {
  titleSelector: "h1.detail-title",
  dateSelector: ".detail-date",
  dateAttr: "data-detail-date",
  descriptionSelector: 'meta[property="og:description"]',
  descriptionAttr: "content",
};

// OPPO's flagship lines: Find X (phones), Find N (foldables), Reno.
// Deliberately no bare "unveils"/"debuts"/"global launch" patterns here —
// OPPO's newsroom also uses that wording for tablets (Pad series) and AR
// glasses (Air Glass), which RELEASE_POLICY.include does not cover;
// requiring a product-line match keeps those out without needing an
// OPPO-specific exclude list.
const INCLUDE_PATTERNS = [/\bfind\s?x\d/i, /\bfind\s?n\d/i, /\breno\s?\d+/i];

// Cheap pre-filter over the sitemap's ~280 URLs, applied to the slug
// before fetching any article page, so we don't download every press
// post just to discard non-launch ones after the fact.
const CANDIDATE_SLUG_PATTERN = /find-?x\d|find-?n\d|reno-?\d|unveils|debuts|launch/i;

/**
 * Official source: OPPO's sitemap (confirmed live, English locale at
 * /en/sitemap.xml) for URL discovery, then each candidate article page is
 * scraped individually via src/utils/htmlScraper.ts's scrapeArticle. This
 * is deliberately not the newsroom listing page — that page is a
 * client-rendered shell with nothing to scrape — but the underlying
 * article pages it would otherwise link to are genuinely server-rendered,
 * putting this in the same reliability tier as Honor/Vivo's listing-page
 * scrapes, just discovered via the sitemap instead. A site redesign that
 * breaks the sitemap or the article selectors degrades to zero events,
 * never a crash or a fabricated one.
 */
export class OppoSource implements EventSource {
  readonly displayName = "Oppo";
  // Verified live: this exact pipeline was run against the real sitemap
  // and 38 real article pages during implementation, surfacing (and
  // fixing) a genuine bug in the process — see README.md's "Source
  // maturity" section.
  readonly maturity = "production";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const sitemapXml = await fetchText(OPPO_SITEMAP_URL);
      const urls = parseSitemapUrls(sitemapXml).filter(
        (url) => url.includes("/newsroom/press/") && CANDIDATE_SLUG_PATTERN.test(url),
      );

      const events: TechEvent[] = [];
      for (const url of urls) {
        const html = await fetchText(url);
        const article = scrapeArticle(html, ARTICLE_SCRAPER_CONFIG);
        if (!article) continue;
        if (!matchesLaunchTitle(article.title, INCLUDE_PATTERNS)) continue;

        const start = extractConfidentDate(article.dateText, new Date());
        if (!start) {
          console.info(
            `[OppoSource] Skipping "${article.title}" — no confident date found. Add to manual.json if confirmed.`,
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
          url,
          category: "hardware",
          importance: "major",
          company: "OPPO",
          sourceType: "official-scrape",
          allDay: true,
        });
      }

      return events;
    } catch (error) {
      console.warn(`[OppoSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}
