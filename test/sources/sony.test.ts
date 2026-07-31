import { describe, it, expect, vi, afterEach } from "vitest";
import { SonySource } from "../../src/sources/sony.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SonySource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new SonySource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses 'Sony Xperia' as its display name", () => {
    expect(new SonySource().displayName).toBe("Sony Xperia");
  });
});
