import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed } from "../../src/utils/feedParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("parseFeed", () => {
  it("parses an Atom feed into normalized FeedItems", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/apple.xml"), "utf-8");
    const items = parseFeed(xml);
    expect(items).toHaveLength(4);
    expect(items[0]?.title).toBe("Apple reports third quarter results");
    expect(items[0]?.link).toBe("https://www.apple.com/newsroom/2026/07/apple-reports-third-quarter-results/");
    expect(items[0]?.publishedAt.getUTCFullYear()).toBe(2026);
  });

  it("parses an RSS 2.0 feed into normalized FeedItems", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/samsung.xml"), "utf-8");
    const items = parseFeed(xml);
    expect(items).toHaveLength(3);
    expect(items[1]?.title).toBe("Samsung Galaxy Unpacked to Take Place on January 20, 2027");
  });

  it("returns an empty array for unrecognized XML", () => {
    expect(parseFeed("<not-a-feed></not-a-feed>")).toEqual([]);
  });

  it("picks the alternate (article) link, not a replies/comments feed link", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Android 17 is here</title>
    <link rel="replies" href="https://android-developers.googleblog.com/feeds/123/comments/default" />
    <link rel="alternate" href="https://android-developers.googleblog.com/2026/06/android-17-is-here.html" />
    <updated>2026-06-16T09:00:00-07:00</updated>
    <content>Today we're releasing Android 17.</content>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items[0]?.link).toBe("https://android-developers.googleblog.com/2026/06/android-17-is-here.html");
  });

  it("strips HTML tags and truncates a long content body to a short description", () => {
    const longHtml = `<div><img src="https://example.com/x.png"><p>${"word ".repeat(200)}</p></div>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Long post</title>
    <link href="https://example.com/post" />
    <updated>2026-06-16T09:00:00-07:00</updated>
    <content><![CDATA[${longHtml}]]></content>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    const description = items[0]?.description ?? "";
    expect(description).not.toContain("<img");
    expect(description).not.toContain("<p>");
    expect(description.length).toBeLessThanOrEqual(161);
  });

  it("prefers the first sentence over blind truncation when one fits within the cap", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Short post</title>
    <link href="https://example.com/post" />
    <updated>2026-06-16T09:00:00-07:00</updated>
    <content>This is the first sentence. This is a second sentence that should be dropped.</content>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items[0]?.description).toBe("This is the first sentence.");
  });

  it("returns an empty array for truncated/malformed XML rather than throwing", () => {
    expect(() => parseFeed("<rss><channel><item><title>Unterminated")).not.toThrow();
    expect(parseFeed("<rss><channel><item><title>Unterminated")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
    expect(parseFeed("not xml at all, just text")).toEqual([]);
  });

  it("skips RSS items and Atom entries missing required fields instead of throwing", () => {
    const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>No link or date</title></item>
  <item><title>Complete</title><link>https://example.com/a</link><pubDate>Mon, 01 Jun 2026 00:00:00 GMT</pubDate></item>
</channel></rss>`;
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Complete");
  });
});
