import { describe, it, expect } from "vitest";
import { dedupeEvents } from "../src/utils/dedupe.js";
import type { TechEvent } from "../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "placeholder",
    title: "Google I/O 2027",
    start: new Date("2027-05-18T17:00:00Z"),
    category: "google",
    importance: "major",
    sourceType: "manual",
    ...overrides,
  };
}

describe("dedupeEvents", () => {
  it("collapses two entries that generate the same ID", () => {
    const events = [makeEvent(), makeEvent({ description: "duplicate from another source" })];
    const result = dedupeEvents(events);
    expect(result).toHaveLength(1);
  });

  it("keeps the first-seen entry on conflict (manual entries ordered first win)", () => {
    const manualVersion = makeEvent({ description: "manual, authoritative" });
    const stubVersion = makeEvent({ description: "stub source" });
    const result = dedupeEvents([manualVersion, stubVersion]);
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe("manual, authoritative");
  });

  it("keeps all events that are not duplicates", () => {
    const events = [
      makeEvent({ title: "Google I/O 2027" }),
      makeEvent({ title: "Apple WWDC 2027", category: "apple" }),
      makeEvent({ title: "Google I/O 2028", start: new Date("2028-05-18T17:00:00Z") }),
    ];
    const result = dedupeEvents(events);
    expect(result).toHaveLength(3);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeEvents([])).toEqual([]);
  });
});
