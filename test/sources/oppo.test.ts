import { describe, it, expect, vi, afterEach } from "vitest";
import { OppoSource } from "../../src/sources/oppo.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OppoSource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new OppoSource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
