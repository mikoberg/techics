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
  it("extracts Galaxy Unpacked events with a confident date and ignores everything else", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/samsung.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const events = await new SamsungSource().fetchEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Samsung Galaxy Unpacked to Take Place on January 20, 2027");
    expect(events[0]?.category).toBe("hardware");
    expect(events[0]?.importance).toBe("major");
    expect(events[0]?.start.toISOString().slice(0, 10)).toBe("2027-01-20");
  });

  it("excludes [Interview] and [Infographic] coverage of Unpacked, even though both mention 'Unpacked' and have a confident date", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/samsung.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const events = await new SamsungSource().fetchEvents();
    const titles = events.map((e) => e.title);

    expect(titles.some((t) => t.includes("[Interview]"))).toBe(false);
    expect(titles.some((t) => t.includes("[Infographic]"))).toBe(false);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new SamsungSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
