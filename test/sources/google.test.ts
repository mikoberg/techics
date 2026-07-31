import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { GoogleSource } from "../../src/sources/google.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("GoogleSource", () => {
  it("treats Android release posts as confirmed on their publish date", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/android.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const source = new GoogleSource();
    const events = await source.fetchEvents();

    // Regression: "is now available" is legitimate software-release
    // phrasing here, not a hardware-sales availability notice — it must
    // NOT be excluded by the shared DEFAULT_EXCLUDE_PATTERNS used by
    // hardware sources (see ANDROID_RELEASE_EXCLUDE_PATTERNS in google.ts).
    const featureDrop = events.find((e) => e.title.includes("QPR1 Feature Drop"));
    expect(featureDrop).toBeDefined();
    expect(featureDrop?.category).toBe("android");
    expect(featureDrop?.importance).toBe("normal");
    expect(featureDrop?.start.toISOString().slice(0, 10)).toBe("2026-07-15");

    const beta = events.find((e) => e.title.includes("Beta 2"));
    expect(beta).toBeDefined();
    expect(beta?.category).toBe("android");
  });

  it("only emits Google I/O / Made by Google events when a confident date is found", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/android.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const source = new GoogleSource();
    const events = await source.fetchEvents();

    const io = events.find((e) => e.title.includes("Google I/O"));
    expect(io).toBeDefined();
    expect(io?.category).toBe("google");
    expect(io?.importance).toBe("major");

    // "Made by Google is coming this fall" has no confident date and must be skipped.
    const madeByGoogle = events.find((e) => e.title.includes("Made by Google"));
    expect(madeByGoogle).toBeUndefined();
  });

  it("does not emit an event for unrelated blog posts", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/android.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const source = new GoogleSource();
    const events = await source.fetchEvents();

    expect(events.some((e) => e.title.includes("Jetpack Compose"))).toBe(false);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new GoogleSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
