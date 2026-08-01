import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { OppoSource } from "../../src/sources/oppo.js";

const SITEMAP_URL = "https://www.oppo.com/en/sitemap.xml";

async function loadFixture(name: string): Promise<string> {
  return readFile(path.resolve(__dirname, `../fixtures/${name}`), "utf-8");
}

async function mockOppoFetch(): Promise<void> {
  const sitemap = await loadFixture("sitemaps/oppo-en-sitemap.xml");
  const findX9Ultra = await loadFixture("html/oppo-article-find-x9-ultra.html");
  const findN6 = await loadFixture("html/oppo-article-find-n6.html");
  const reno14Sale = await loadFixture("html/oppo-article-reno14-sale.html");

  vi.mocked(fetchText).mockImplementation(async (url: string) => {
    if (url === SITEMAP_URL) return sitemap;
    if (url.includes("find-x9-ultra")) return findX9Ultra;
    if (url.includes("find-n6")) return findN6;
    if (url.includes("reno14-goes-on-sale")) return reno14Sale;
    throw new Error(`unexpected fetch: ${url}`);
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("OppoSource", () => {
  it("includes genuine Find X/Find N launches with correct fields, discovered via the sitemap", async () => {
    await mockOppoFetch();

    const events = await new OppoSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles).toContain("OPPO Find X9 Launch");
    expect(titles).toContain("OPPO Find N6 Launch");

    const findX9 = events.find((e) => e.title === "OPPO Find X9 Launch");
    expect(findX9?.category).toBe("hardware");
    expect(findX9?.importance).toBe("major");
    expect(findX9?.url).toBe("https://www.oppo.com/en/newsroom/press/oppo-unveils-find-x9-ultra/");
    expect(findX9?.start.toISOString().slice(0, 10)).toBe("2026-04-15");
    expect(findX9?.company).toBe("OPPO");
    expect(findX9?.sourceType).toBe("official-scrape");
    expect(findX9?.allDay).toBe(true);
    expect(findX9?.description).toBe("OPPO flagship phone launch.");
  });

  it("never fetches the CSR-report article (slug pre-filter) and excludes the sale post by title", async () => {
    await mockOppoFetch();

    const events = await new OppoSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles.some((t) => t.includes("Reno14"))).toBe(false);
    expect(fetchText).not.toHaveBeenCalledWith(
      "https://www.oppo.com/en/newsroom/press/oppo-csr-report-2026/",
    );
  });

  it("returns an empty array and does not throw when the sitemap fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new OppoSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when an article page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockImplementation(async (url: string) => {
      if (url === SITEMAP_URL) {
        return `<?xml version="1.0"?><urlset><url><loc>https://www.oppo.com/en/newsroom/press/oppo-unveils-find-x9-ultra/</loc></url></urlset>`;
      }
      return "<html><body>redesigned page</body></html>";
    });

    const events = await new OppoSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
