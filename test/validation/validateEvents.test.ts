import { describe, it, expect } from "vitest";
import { validateEvents } from "../../src/validation/validateEvents.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "placeholder",
    title: "Google I/O 2027",
    start: new Date("2027-05-18T17:00:00Z"),
    url: "https://io.google/",
    description: "Google's annual developer conference.",
    category: "google",
    importance: "major",
    sourceType: "official-feed",
    ...overrides,
  };
}

describe("validateEvents", () => {
  it("publishes a fully clean event pool untouched", () => {
    const events = [makeEvent(), makeEvent({ id: "x2", title: "Apple WWDC 2027", category: "apple" })];
    const report = validateEvents(events);
    expect(report.published).toHaveLength(2);
    expect(report.rejected).toHaveLength(0);
    expect(report.duplicates).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
  });

  it("rejects an event with an empty title", () => {
    const report = validateEvents([makeEvent({ title: "   " })]);
    expect(report.published).toHaveLength(0);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]?.reasons).toContain("empty title");
  });

  it("rejects an event with an invalid start date", () => {
    const report = validateEvents([makeEvent({ start: new Date("not-a-date") })]);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]?.reasons).toContain("invalid start date");
  });

  it("rejects an event with an implausibly far past/future start date", () => {
    const tooOld = validateEvents([makeEvent({ start: new Date("1990-01-01T00:00:00Z") })]);
    expect(tooOld.rejected).toHaveLength(1);
    expect(tooOld.rejected[0]?.reasons[0]).toMatch(/implausible start date/);

    const tooFar = validateEvents([makeEvent({ start: new Date("2099-01-01T00:00:00Z") })]);
    expect(tooFar.rejected).toHaveLength(1);
  });

  it("rejects an event whose end is before its start", () => {
    const report = validateEvents([
      makeEvent({ start: new Date("2027-05-18T17:00:00Z"), end: new Date("2027-05-18T16:00:00Z") }),
    ]);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]?.reasons).toContain("end date before start date");
  });

  it("rejects an event with an invalid category or importance", () => {
    const badCategory = validateEvents([makeEvent({ category: "not-a-category" as never })]);
    expect(badCategory.rejected).toHaveLength(1);

    const badImportance = validateEvents([makeEvent({ importance: "critical" as never })]);
    expect(badImportance.rejected).toHaveLength(1);
  });

  it("rejects an event with a malformed url but allows a missing one (warning only)", () => {
    const malformed = validateEvents([makeEvent({ url: "not a url" })]);
    expect(malformed.rejected).toHaveLength(1);
    expect(malformed.rejected[0]?.reasons[0]).toMatch(/malformed url/);

    const { url: _url, ...rest } = makeEvent();
    const missing = validateEvents([rest as TechEvent]);
    expect(missing.rejected).toHaveLength(0);
    expect(missing.published).toHaveLength(1);
    expect(missing.warnings).toHaveLength(1);
    expect(missing.warnings[0]?.reasons).toContain("missing official url");
  });

  it("warns but still publishes an event with no description", () => {
    const { description: _description, ...rest } = makeEvent();
    const report = validateEvents([rest as TechEvent]);
    expect(report.published).toHaveLength(1);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]?.reasons).toContain("missing description");
  });

  it("tracks duplicates separately from rejections, keeping the first-seen copy", () => {
    const first = makeEvent({ description: "first" });
    const second = makeEvent({ id: "different-id", description: "second" });
    const report = validateEvents([first, second]);

    expect(report.published).toHaveLength(1);
    expect(report.published[0]?.description).toBe("first");
    expect(report.duplicates).toHaveLength(1);
    expect(report.duplicates[0]?.description).toBe("second");
    expect(report.rejected).toHaveLength(0);
  });
});
