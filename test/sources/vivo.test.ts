import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { VivoSource } from "../../src/sources/vivo.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("VivoSource", () => {
  it("includes genuine X-series flagship launches with correct fields", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/vivo-press.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new VivoSource().fetchEvents();
    const titles = events.map((e) => e.title);

    // Canonical title generation: raw newsroom headlines are rewritten
    // into short, recognizable calendar titles.
    expect(titles).toContain("vivo X300 FE Launch");
    expect(titles).toContain("vivo X300 Ultra Launch");

    const x300fe = events.find((e) => e.title === "vivo X300 FE Launch");
    expect(x300fe?.category).toBe("hardware");
    expect(x300fe?.importance).toBe("major");
    expect(x300fe?.url).toBe(
      "https://vivonewsroom.in/press-release/vivo-unveils-x300-fe-launches-with-zeiss-telephoto-extender-gen-2-and-snapdragon-8-gen-5/",
    );
    expect(x300fe?.start.toISOString().slice(0, 10)).toBe("2026-07-22");
  });

  it("excludes CSR events, color/variant posts, and sale posts even when they mention a flagship name", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/vivo-press.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new VivoSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles.some((t) => t.includes("Ignite 2026"))).toBe(false);
    expect(titles.some((t) => t.includes("Fusion Red Variant"))).toBe(false);
    expect(titles.some((t) => t.includes("Goes On Sale"))).toBe(false);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new VivoSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockResolvedValue("<html><body>redesigned page</body></html>");
    const events = await new VivoSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
