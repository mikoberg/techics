import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { AppleSource } from "../../src/sources/apple.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("AppleSource", () => {
  it("extracts WWDC and special-event announcements with confident dates, skips vague ones", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/apple.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const source = new AppleSource();
    const events = await source.fetchEvents();

    // 4 items in fixture match keywords (special event, WWDC, keynote) minus
    // the "Apple reports third quarter results" one which doesn't match at all.
    // Of the matching ones, "Apple announces future keynote plans" has no
    // confident date ("later this year") and must be skipped.
    expect(events).toHaveLength(2);

    // Canonical title generation: raw newsroom headlines are rewritten
    // into short, recognizable calendar titles.
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Apple Special Event 2026");
    expect(titles).toContain("Apple WWDC 2026");

    for (const event of events) {
      expect(event.category).toBe("apple");
      expect(event.importance).toBe("major");
      expect(event.url).toMatch(/^https:\/\/www\.apple\.com\/newsroom\//);
      expect(event.company).toBe("Apple");
      expect(event.sourceType).toBe("official-feed");
      expect(event.allDay).toBe(true);
    }

    const specialEvent = events.find((e) => e.title === "Apple Special Event 2026");
    expect(specialEvent?.description).toBe("Apple hardware announcement event.");
    const wwdc = events.find((e) => e.title === "Apple WWDC 2026");
    expect(wwdc?.description).toBe("Apple's annual Worldwide Developers Conference.");
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));

    const source = new AppleSource();
    const events = await source.fetchEvents();

    expect(events).toEqual([]);
  });
});
