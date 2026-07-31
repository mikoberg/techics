import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { fetchText, __resetHttpCacheForTests } from "../../src/utils/httpCache.js";

describe("fetchText", () => {
  beforeEach(() => {
    __resetHttpCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("only fetches a given URL once per process, even for concurrent callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<rss></rss>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = "https://example.com/feed.xml";
    const [a, b] = await Promise.all([fetchText(url), fetchText(url)]);

    expect(a).toBe("<rss></rss>");
    expect(b).toBe("<rss></rss>");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve("") }),
    );

    await expect(fetchText("https://example.com/broken.xml")).rejects.toThrow(/503/);
  });

  it("rate-limits requests to the same hostname to at most 1/second", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("ok"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise1 = fetchText("https://example.com/a.xml");
    const promise2 = fetchText("https://example.com/b.xml");

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([promise1, promise2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
