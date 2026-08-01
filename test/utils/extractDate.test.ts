import { describe, it, expect } from "vitest";
import { extractConfidentDate } from "../../src/utils/extractDate.js";

const REFERENCE = new Date("2026-08-01T00:00:00Z");

describe("extractConfidentDate", () => {
  it("extracts an explicit month/day/year", () => {
    const result = extractConfidentDate("Join us September 9, 2027 for the event", REFERENCE);
    expect(result?.toISOString().slice(0, 10)).toBe("2027-09-09");
  });

  it("extracts an ISO date", () => {
    const result = extractConfidentDate("The event is scheduled for 2027-06-08", REFERENCE);
    expect(result?.toISOString().slice(0, 10)).toBe("2027-06-08");
  });

  it("extracts the date portion of a full ISO datetime string (T separator)", () => {
    // Real shape observed live: Samsung Unpacked's countdown widget uses
    // `data-end-time="2026-08-07T03:00:00Z-0400"` — a plain \b boundary
    // fails here since digit-then-"T" has no word-boundary transition.
    const result = extractConfidentDate("2026-08-07T03:00:00Z-0400", REFERENCE);
    expect(result?.toISOString().slice(0, 10)).toBe("2026-08-07");
  });

  it("assumes the next occurrence when no year is given", () => {
    const result = extractConfidentDate("Apple to host a special event on September 9", REFERENCE);
    expect(result?.toISOString().slice(0, 10)).toBe("2026-09-09");
  });

  it("rolls over to next year when the month/day is implausibly far in the past relative to reference", () => {
    const result = extractConfidentDate("The keynote is on January 20", REFERENCE);
    expect(result?.toISOString().slice(0, 10)).toBe("2027-01-20");
  });

  it("does NOT roll over for a recent-past date (recap article referencing an event that just happened)", () => {
    // Reference: an article published shortly after an event it's recapping.
    const result = extractConfidentDate(
      "A First Look at what happened at the event on July 22",
      REFERENCE,
    );
    expect(result?.toISOString().slice(0, 10)).toBe("2026-07-22");
  });

  it("returns undefined for vague text", () => {
    expect(extractConfidentDate("Coming later this year", REFERENCE)).toBeUndefined();
    expect(extractConfidentDate("Details to follow this fall", REFERENCE)).toBeUndefined();
  });

  it("returns undefined for text with no date at all", () => {
    expect(extractConfidentDate("We are excited to announce something big", REFERENCE)).toBeUndefined();
  });
});
