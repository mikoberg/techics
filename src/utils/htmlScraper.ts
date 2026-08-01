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

export interface ArticlePageScraperConfig {
  /** CSS selector for the article's title, on a single article page. */
  titleSelector: string;
  /** Attribute to read the title from (e.g. "content" for a meta tag); reads text content when omitted. */
  titleAttr?: string;
  /** CSS selector for the raw date, on a single article page. */
  dateSelector: string;
  /** Attribute to read the date from (e.g. a `data-*` attribute); reads text content when omitted. */
  dateAttr?: string;
  /** CSS selector for an optional short description, e.g. a meta tag. */
  descriptionSelector?: string;
  /** Attribute to read the description from (e.g. "content" for a meta tag); reads text content when omitted. */
  descriptionAttr?: string;
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

/**
 * Single-page counterpart to scrapeNewsroom, for any page where the
 * caller already knows the URL and just needs to pull a title/date/
 * description out of that one page — no item/link selectors needed. Two
 * distinct callers use this: per-article pages discovered via a sitemap
 * (e.g. OPPO, whose newsroom *listing* page is a client-rendered shell but
 * individual articles are server-rendered), and dedicated official event
 * pages (e.g. Apple Events, Microsoft Build, Samsung Unpacked), which are
 * a single evergreen URL rather than one-article-per-launch. Same
 * conservative contract as scrapeNewsroom: any unexpected structure
 * returns null, never a thrown error or a guessed result.
 */
export function scrapeArticle(
  html: string,
  config: ArticlePageScraperConfig,
): Omit<ScrapedArticle, "url"> | null {
  try {
    const $ = cheerio.load(html);

    const titleEl = $(config.titleSelector).first();
    const title = (config.titleAttr ? titleEl.attr(config.titleAttr) : titleEl.text())?.trim() ?? "";

    const dateEl = $(config.dateSelector).first();
    const dateText = (config.dateAttr ? dateEl.attr(config.dateAttr) : dateEl.text())?.trim();

    if (!title || !dateText) return null;

    let description: string | undefined;
    if (config.descriptionSelector) {
      const descEl = $(config.descriptionSelector).first();
      description =
        (config.descriptionAttr ? descEl.attr(config.descriptionAttr) : descEl.text())?.trim() ||
        undefined;
    }

    return { title, dateText, ...(description ? { description } : {}) };
  } catch {
    return null;
  }
}
