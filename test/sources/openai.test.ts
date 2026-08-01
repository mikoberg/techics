import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { OpenAiSource } from "../../src/sources/openai.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("OpenAiSource", () => {
  it("extracts DevDay announcements with a confident date and ignores unrelated news", async () => {
    const xml = await readFile(path.resolve(__dirname, "../fixtures/feeds/openai.xml"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(xml);

    const events = await new OpenAiSource().fetchEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("OpenAI DevDay 2026");
    expect(events[0]?.category).toBe("ai");
    expect(events[0]?.importance).toBe("major");
    expect(events[0]?.start.toISOString().slice(0, 10)).toBe("2026-10-15");
    // Official DevDay landing page, distinct from the scraped article URL.
    expect(events[0]?.watchUrl).toBe("https://openai.com/devday/");
    expect(events[0]?.watchUrl).not.toBe(events[0]?.url);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new OpenAiSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
