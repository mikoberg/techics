import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { HonorSource } from "../../src/sources/honor.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("HonorSource", () => {
  it("includes genuine Magic-series flagship/foldable launches with correct fields", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/honor-news.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new HonorSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles.some((t) => t.includes("Magic V6"))).toBe(true);
    expect(titles.some((t) => t.includes("Magic8 Pro"))).toBe(true);

    const magicV6 = events.find((e) => e.title.includes("Magic V6"));
    expect(magicV6?.category).toBe("hardware");
    expect(magicV6?.importance).toBe("major");
    expect(magicV6?.url).toBe("https://www.honor.com/global/news/honor-magic-v6-launch/");
    expect(magicV6?.start.toISOString().slice(0, 10)).toBe("2026-06-04");
    expect(magicV6?.company).toBe("HONOR");
    expect(magicV6?.sourceType).toBe("official-scrape");
    expect(magicV6?.allDay).toBe(true);
    expect(magicV6?.description).toBe("HONOR foldable flagship launch.");
    // No dedicated event page exists for HONOR — watchUrl falls back to the article.
    expect(magicV6?.watchUrl).toBe(magicV6?.url);
  });

  it("excludes campaign/marketing/minor-device posts, even when they mention 'launched'", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/honor-news.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new HonorSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles.some((t) => t.includes("ForHONOR Campaign"))).toBe(false);
    expect(titles.some((t) => t.includes("Magic Stories Awards"))).toBe(false);
    expect(titles.some((t) => t.includes("HONOR X9d"))).toBe(false);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new HonorSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockResolvedValue("<html><body>redesigned page</body></html>");
    const events = await new HonorSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
