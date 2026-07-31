import * as cheerio from "cheerio";

export interface ScrapedArticle {
  title: string;
  url: string;
  dateText: string;
  description?: string;
}

export interface NewsroomScraperConfig {
  /** Used to resolve relative hrefs into absolute URLs. */
  baseUrl: string;
  /** CSS selector matching one element per article/press-release. */
  itemSelector: string;
  /** CSS selector, relative to each item, for the title text. */
  titleSelector: string;
  /** CSS selector, relative to each item, for the element carrying the article's href. */
  linkSelector: string;
  /** CSS selector, relative to each item, for the raw date text. */
  dateSelector: string;
  /** CSS selector, relative to each item, for an optional short description. */
  descriptionSelector?: string;
}

/**
 * Extracts a list of articles from an official newsroom page using
 * configurable, stable CSS selectors (via cheerio). This is deliberately
 * conservative: any unexpected structure — a missing selector, malformed
 * HTML, an empty document — results in an empty array rather than a
 * thrown error or a guessed/partial result. A vendor's site redesign
 * should silently yield zero events, never a crash and never a
 * fabricated one.
 */
export function scrapeNewsroom(html: string, config: NewsroomScraperConfig): ScrapedArticle[] {
  try {
    const $ = cheerio.load(html);
    const articles: ScrapedArticle[] = [];

    $(config.itemSelector).each((_index, element) => {
      const item = $(element);

      const title = item.find(config.titleSelector).first().text().trim();
      const dateText = item.find(config.dateSelector).first().text().trim();

      const linkEl = item.find(config.linkSelector).first();
      const href = linkEl.attr("href");

      if (!title || !dateText || !href) return; // skip this item, keep going

      let url: string;
      try {
        url = new URL(href, config.baseUrl).toString();
      } catch {
        return; // unresolvable href — skip this item
      }

      const description = config.descriptionSelector
        ? item.find(config.descriptionSelector).first().text().trim() || undefined
        : undefined;

      articles.push({ title, url, dateText, ...(description ? { description } : {}) });
    });

    return articles;
  } catch {
    return [];
  }
}
