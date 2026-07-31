import { describe, it, expect, vi, afterEach } from "vitest";
import { XiaomiSource } from "../../src/sources/xiaomi.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("XiaomiSource", () => {
  it("returns no events and makes no network calls (manual.json is the source of truth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const events = await new XiaomiSource().fetchEvents();
    expect(events).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
