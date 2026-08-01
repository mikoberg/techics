import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock("../../src/utils/httpCache.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../src/utils/httpCache.js";
import { MicrosoftSource } from "../../src/sources/microsoft.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("MicrosoftSource", () => {
  it("extracts the confirmed Build date from the event page's og:description", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/microsoft-build.html"), "utf-8");
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new MicrosoftSource().fetchEvents();

    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.title).toBe("Microsoft Build 2026");
    expect(event.start.toISOString().slice(0, 10)).toBe("2026-06-02");
    expect(event.url).toBe("https://build.microsoft.com/");
    expect(event.category).toBe("microsoft");
    expect(event.importance).toBe("major");
    expect(event.company).toBe("Microsoft");
    expect(event.sourceType).toBe("official-scrape");
    expect(event.discoveryMethod).toBe("event_page");
    expect(event.allDay).toBe(true);
  });

  it("returns an empty array when the page has no confident date yet (between cycles)", async () => {
    const html = await readFile(
      path.resolve(__dirname, "../fixtures/html/microsoft-build-no-date.html"),
      "utf-8",
    );
    vi.mocked(fetchText).mockResolvedValue(html);

    const events = await new MicrosoftSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the fetch fails", async () => {
    vi.mocked(fetchText).mockRejectedValue(new Error("network down"));
    const events = await new MicrosoftSource().fetchEvents();
    expect(events).toEqual([]);
  });

  it("returns an empty array and does not throw when the page structure is unrecognized", async () => {
    vi.mocked(fetchText).mockResolvedValue("<html><body>redesigned page</body></html>");
    const events = await new MicrosoftSource().fetchEvents();
    expect(events).toEqual([]);
  });
});
