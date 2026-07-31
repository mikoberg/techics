import { describe, it, expect } from "vitest";
import { generateCalendar } from "../src/generator/generateCalendar.js";
import { validateIcs } from "../src/utils/validate.js";
import type { TechEvent } from "../src/models/TechEvent.js";

const fixtureEvents: TechEvent[] = [
  {
    id: "placeholder-1",
    title: "Apple WWDC 2027",
    start: new Date("2027-06-07T17:00:00Z"),
    end: new Date("2027-06-07T19:00:00Z"),
    url: "https://developer.apple.com/wwdc/",
    location: "Cupertino, CA",
    category: "apple",
    importance: "major",
    sourceType: "official-feed",
  },
  {
    id: "placeholder-2",
    title: "Android 16 Stable Release",
    start: new Date("2027-03-01T00:00:00Z"),
    category: "android",
    importance: "major",
    sourceType: "official-feed",
  },
  {
    id: "placeholder-3",
    title: "Google I/O 2027",
    start: new Date("2027-05-18T17:00:00Z"),
    description: "Annual keynote",
    category: "google",
    importance: "major",
    sourceType: "official-feed",
    allDay: true,
  },
];

describe("generateCalendar", () => {
  it("produces structurally valid ICS", () => {
    const ics = generateCalendar(fixtureEvents);
    expect(() => validateIcs(ics)).not.toThrow();
  });

  it("includes the calendar name and default PRODID", () => {
    const ics = generateCalendar(fixtureEvents);
    expect(ics).toContain("PRODID:-//TechCalendar//EN");
    expect(ics).toContain("X-WR-CALNAME:Tech Calendar");
  });

  it("respects a custom calendar name", () => {
    const ics = generateCalendar(fixtureEvents, { calendarName: "Tech Calendar — Apple" });
    expect(ics).toContain("X-WR-CALNAME:Tech Calendar — Apple");
  });

  it("orders events chronologically by DTSTART", () => {
    const ics = generateCalendar(fixtureEvents);
    const summaryPositions = ["Android 16 Stable Release", "Google I/O 2027", "Apple WWDC 2027"].map(
      (title) => ics.indexOf(title),
    );
    expect(summaryPositions.every((pos) => pos !== -1)).toBe(true);
    expect(summaryPositions[0]).toBeLessThan(summaryPositions[1]!);
    expect(summaryPositions[1]).toBeLessThan(summaryPositions[2]!);
  });

  it("applies a filter option to narrow output", () => {
    const ics = generateCalendar(fixtureEvents, { filter: (e) => e.category === "android" });
    expect(ics).toContain("Android 16 Stable Release");
    expect(ics).not.toContain("Apple WWDC 2027");
    expect(ics).not.toContain("Google I/O 2027");
  });

  it("dedupes events with identical category/title/date before writing", () => {
    const duplicate: TechEvent = { ...fixtureEvents[0]!, id: "different-id-but-same-event" };
    const ics = generateCalendar([...fixtureEvents, duplicate]);
    const occurrences = ics.split("SUMMARY:Apple WWDC 2027").length - 1;
    expect(occurrences).toBe(1);
  });

  it("emits an all-day (VALUE=DATE) event for allDay events, with no time component", () => {
    const ics = generateCalendar(fixtureEvents, { filter: (e) => e.title === "Google I/O 2027" });
    expect(ics).toContain("DTSTART;VALUE=DATE:20270518");
    expect(ics).not.toContain("DTSTART:20270518T");
  });

  it("emits a timed DTSTART for non-allDay events", () => {
    const ics = generateCalendar(fixtureEvents, { filter: (e) => e.title === "Apple WWDC 2027" });
    expect(ics).toContain("DTSTART:20270607T170000Z");
  });

  it("includes METHOD:PUBLISH and CALSCALE:GREGORIAN for maximum client compatibility, and always renders true UTC (Z-suffixed) times regardless of the host machine's timezone", () => {
    const ics = generateCalendar(fixtureEvents);
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("CALSCALE:GREGORIAN");
    expect(ics).toContain("DTSTART:20270607T170000Z");
    expect(ics).not.toContain("X-WR-TIMEZONE");
  });
});
