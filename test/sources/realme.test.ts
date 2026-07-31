import { describe, it, expect, vi, afterEach } from "vitest";
import { RealmeSource } from "../../src/sources/realme.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RealmeSource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new RealmeSource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
