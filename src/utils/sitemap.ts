/**
 * Parses `<loc>` entries out of a sitemap (or sitemap index) XML document.
 * Deliberately just a regex scan, not a full XML parser — sitemaps are a
 * fixed, simple format, and a vendor's other markup quirks should never
 * make URL discovery throw. Malformed input yields an empty array, same
 * "degrade to nothing rather than crash or guess" contract as the rest of
 * the scraping utilities.
 */
export function parseSitemapUrls(xml: string): string[] {
  try {
    const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
    return Array.from(matches, (match) => match[1]!.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
