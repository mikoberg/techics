import { XMLParser } from "fast-xml-parser";

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  publishedAt: Date;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  // Official blog/newsroom posts can legitimately contain thousands of
  // standard HTML entities (&amp;, &nbsp;, etc.) in their prose content —
  // well above fast-xml-parser's default DoS-protection limit of 1000.
  // These caps are still bounded (not disabled) to keep the DoS
  // protection meaningful for external, semi-trusted feed content.
  processEntities: { enabled: true, maxEntityCount: 20000, maxEntitySize: 10000 },
});

/**
 * Normalizes either an RSS 2.0 (<rss><channel><item>) or Atom
 * (<feed><entry>) document into a flat FeedItem[], using fast-xml-parser
 * rather than hand-rolled regex — a real parser is far less likely to
 * silently misparse when a vendor tweaks feed formatting. Every call site
 * already wraps its own fetch+parse in try/catch, but this parser also
 * guards itself (e.g. against the entity-expansion limits configured
 * above, which throw when exceeded) so it's safe to call directly too.
 */
export function parseFeed(xml: string): FeedItem[] {
  try {
    const doc: unknown = parser.parse(xml);

    const rssItems = getPath(doc, ["rss", "channel", "item"]);
    if (rssItems !== undefined) {
      return toArray(rssItems).map(parseRssItem).filter(isDefined);
    }

    const atomEntries = getPath(doc, ["feed", "entry"]);
    if (atomEntries !== undefined) {
      return toArray(atomEntries).map(parseAtomEntry).filter(isDefined);
    }

    return [];
  } catch {
    return [];
  }
}

function parseRssItem(item: unknown): FeedItem | undefined {
  if (typeof item !== "object" || item === null) return undefined;
  const v = item as Record<string, unknown>;

  const title = textOf(v.title);
  const link = textOf(v.link);
  const pubDateRaw = textOf(v.pubDate);
  if (!title || !link || !pubDateRaw) return undefined;

  const publishedAt = new Date(pubDateRaw);
  if (Number.isNaN(publishedAt.getTime())) return undefined;

  const rawDescription = textOf(v.description) ?? textOf(v["content:encoded"]) ?? "";
  const description = cleanDescription(rawDescription);

  return { title, link, description, publishedAt };
}

function parseAtomEntry(entry: unknown): FeedItem | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const v = entry as Record<string, unknown>;

  const title = textOf(v.title);
  const updatedRaw = textOf(v.updated) ?? textOf(v.published);
  if (!title || !updatedRaw) return undefined;

  const publishedAt = new Date(updatedRaw);
  if (Number.isNaN(publishedAt.getTime())) return undefined;

  const link = extractAtomLink(v.link);
  if (!link) return undefined;

  const rawDescription = textOf(v.summary) ?? textOf(v.content) ?? "";
  const description = cleanDescription(rawDescription);

  return { title, link, description, publishedAt };
}

/**
 * Atom entries commonly carry several <link> elements (the article
 * itself, a comments/replies feed, a self-reference to the Atom XML,
 * etc.), distinguished by @rel. Per the Atom spec, a link with no rel
 * attribute (or rel="alternate") is the entry's own page — that's what we
 * want. Any other rel (e.g. "replies", "self") must never be picked as
 * the article URL, or we end up linking to a comments feed instead of the
 * actual post.
 */
function extractAtomLink(link: unknown): string | undefined {
  const candidates = toArray(link).filter(
    (candidate): candidate is Record<string, unknown> =>
      typeof candidate === "object" && candidate !== null,
  );

  const alternate = candidates.find((candidate) => {
    const rel = candidate["@_rel"];
    return rel === undefined || rel === "alternate";
  });
  if (alternate) {
    const href = alternate["@_href"];
    if (typeof href === "string") return href;
  }

  for (const candidate of candidates) {
    const href = candidate["@_href"];
    if (typeof href === "string") return href;
  }

  if (typeof link === "string") return link;
  return undefined;
}

const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Blog/newsroom feeds often put the *entire* HTML post body in
 * <content>/<description>, which is unusable as a short calendar/RSS/API
 * description. Strips HTML tags and collapses whitespace, then prefers
 * the first sentence over blind character truncation (a clean sentence
 * reads far better than a mid-sentence cut-off), still capped as a
 * last resort for a single very long "sentence". This is only the
 * fallback — sources try src/utils/curatedDescriptions.ts's short,
 * human-written summaries first, for the recurring franchises this
 * project already targets.
 */
function cleanDescription(raw: string): string {
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const firstSentence = new RegExp(`^(.{1,${MAX_DESCRIPTION_LENGTH}}?[.!?])(\\s|$)`).exec(text);
  if (firstSentence?.[1]) return firstSentence[1];

  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`;
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "#text" in value) {
    const text = (value as Record<string, unknown>)["#text"];
    return typeof text === "string" ? text.trim() : undefined;
  }
  return undefined;
}

function getPath(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
