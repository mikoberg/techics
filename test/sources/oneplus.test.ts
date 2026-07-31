import { describe, it, expect, vi, afterEach } from "vitest";
import { OnePlusSource } from "../../src/sources/oneplus.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OnePlusSource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new OnePlusSource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
