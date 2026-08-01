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
  it("returns an empty array when the hero section is in its post-event (recap) state, no confident date", async () => {
    // Real state observed live at time of writing: the hero currently
    // recaps the most recent keynote ("Coming later this year" — vague),
    // not a save-the-date for the next one.
    const html = await readFile(
      path.resolve(__dirname, "../fixtures/html/apple-events-post-event.html"),
      "utf-8",
    );
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new AppleSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("extracts the confirmed date once the hero section carries a genuine pre-event invite", async () => {
    const html = await readFile(
      path.resolve(__dirname, "../fixtures/html/apple-events-pre-event.html"),
      "utf-8",
    );
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new AppleSource().fetchEvents();

    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.title).toBe("Apple Special Event 2027");
    expect(event.start.toISOString().slice(0, 10)).toBe("2027-09-09");
    expect(event.url).toBe("https://www.apple.com/apple-events/");
    expect(event.category).toBe("apple");
    expect(event.importance).toBe("major");
    expect(event.company).toBe("Apple");
    expect(event.sourceType).toBe("official-scrape");
    expect(event.discoveryMethod).toBe("event_page");
    expect(event.allDay).toBe(true);
    expect(event.description).toBe("Apple hardware announcement event.");
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new AppleSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockResolvedValue("<html><body>redesigned page</body></html>");
    const events = await new AppleSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
