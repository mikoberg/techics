import { describe, it, expect } from "vitest";
import { generateRss } from "../../src/generator/generateRss.js";
import { parseFeed } from "../../src/utils/feedParser.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

const events: TechEvent[] = [
  {
    id: "apple-1",
    title: "Apple <Special> Event & More",
    description: "Details & more info",
    start: new Date("2027-09-09T17:00:00Z"),
    url: "https://apple.com/newsroom/example",
    category: "apple",
    importance: "major",
    sourceType: "official-feed",
  },
];

describe("generateRss", () => {
  it("produces valid, parseable RSS 2.0 XML", () => {
    const xml = generateRss(events, { siteUrl: "https://example.com" });
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");

    const items = parseFeed(xml);
    expect(items).toHaveLength(1);
  });

  it("escapes XML-special characters in title and description", () => {
    const xml = generateRss(events, { siteUrl: "https://example.com" });
    expect(xml).toContain("&lt;Special&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).not.toContain("<Special>");
  });

  it("uses the event start as pubDate and its url as link", () => {
    const xml = generateRss(events, { siteUrl: "https://example.com" });
    expect(xml).toContain("https://apple.com/newsroom/example");
    const items = parseFeed(xml);
    expect(items[0]?.publishedAt.toISOString()).toBe("2027-09-09T17:00:00.000Z");
  });

  it("falls back to the site URL when an event has no url", () => {
    const noUrlEvent: TechEvent = { ...events[0]!, id: "x" };
    delete noUrlEvent.url;
    const xml = generateRss([noUrlEvent], { siteUrl: "https://example.com" });
    const items = parseFeed(xml);
    expect(items[0]?.link).toBe("https://example.com");
  });
});
