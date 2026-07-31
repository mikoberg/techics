import { describe, it, expect, vi, afterEach } from "vitest";
import { NothingSource } from "../../src/sources/nothing.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NothingSource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new NothingSource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
