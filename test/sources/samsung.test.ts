import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { SamsungSource } from "../../src/sources/samsung.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SamsungSource", () => {
  it("extracts the confirmed Unpacked date from the reservation page's countdown widget", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/samsung-unpacked.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new SamsungSource().fetchEvents();

    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.title).toBe("Samsung Galaxy Unpacked August 2026");
    expect(event.start.toISOString().slice(0, 10)).toBe("2026-08-07");
    expect(event.url).toBe("https://www.samsung.com/us/unpacked/");
    expect(event.category).toBe("hardware");
    expect(event.importance).toBe("major");
    expect(event.company).toBe("Samsung");
    expect(event.sourceType).toBe("official-scrape");
    expect(event.discoveryMethod).toBe("event_page");
    expect(event.allDay).toBe(true);
  });

  it("returns an empty array when the countdown widget has no active dates (between cycles)", async () => {
    const html = await readFile(
      path.resolve(__dirname, "../fixtures/html/samsung-unpacked-no-countdown.html"),
      "utf-8",
    );
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new SamsungSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new SamsungSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockResolvedValue("<html><body>redesigned page</body></html>");
    const events = await new SamsungSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
