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

  describe("watchUrl / DESCRIPTION formatting", () => {
    it("appends an 'Official event:' block to DESCRIPTION when watchUrl differs from url", () => {
      const event: TechEvent = {
        id: "watch-1",
        title: "Samsung Galaxy Unpacked August 2026",
        description: "Samsung's flagship Galaxy device launch event.",
        start: new Date("2026-08-07T00:00:00Z"),
        url: "https://news.samsung.com/global/some-article",
        watchUrl: "https://www.samsung.com/us/unpacked/",
        category: "hardware",
        importance: "major",
        sourceType: "official-scrape",
        allDay: true,
      };
      const ics = generateCalendar([event]);
      // ICS line-folds long DESCRIPTION values, so check the unfolded text
      // rather than a substring that might straddle a fold boundary.
      const unfolded = ics.replace(/\r\n /g, "");
      expect(unfolded).toContain(
        "DESCRIPTION:Samsung's flagship Galaxy device launch event.\\n\\nOfficial event:\\nhttps://www.samsung.com/us/unpacked/",
      );
    });

    it("still shows the link in DESCRIPTION even when watchUrl equals url — Google Calendar never surfaces the ICS URL property", () => {
      // Confirmed live: a real Google Calendar subscription showed no
      // link at all for a Samsung event where watchUrl === url, because
      // Google Calendar doesn't display the VEVENT URL property in its
      // UI. The description is the only place many users will ever see
      // this link, so it must appear there regardless of whether it
      // matches the `url` property.
      const event: TechEvent = {
        id: "watch-2",
        title: "Microsoft Build 2026",
        description: "Microsoft's annual developer conference.",
        start: new Date("2026-06-02T00:00:00Z"),
        url: "https://build.microsoft.com/",
        watchUrl: "https://build.microsoft.com/",
        category: "microsoft",
        importance: "major",
        sourceType: "official-scrape",
        allDay: true,
      };
      const ics = generateCalendar([event]);
      expect(ics).toContain("Official event:");
      const unfolded = ics.replace(/\r\n /g, "");
      expect(unfolded).toContain(
        "DESCRIPTION:Microsoft's annual developer conference.\\n\\nOfficial event:\\nhttps://build.microsoft.com/",
      );
    });

    it("does not append an 'Official event:' block when watchUrl is absent", () => {
      const event: TechEvent = {
        id: "watch-3",
        title: "HONOR Magic V6 Launch",
        description: "HONOR foldable flagship launch.",
        start: new Date("2026-06-04T00:00:00Z"),
        url: "https://www.honor.com/global/news/honor-magic-v6-launch/",
        category: "hardware",
        importance: "major",
        sourceType: "official-scrape",
        allDay: true,
      };
      const ics = generateCalendar([event]);
      expect(ics).not.toContain("Official event:");
    });

    it("generates an X-ALT-DESC HTML alternate description with a clickable watch link", () => {
      const event: TechEvent = {
        id: "watch-4",
        title: "Samsung Galaxy Unpacked August 2026",
        description: "Samsung's flagship Galaxy device launch event.",
        start: new Date("2026-08-07T00:00:00Z"),
        url: "https://news.samsung.com/global/some-article",
        watchUrl: "https://www.samsung.com/us/unpacked/",
        category: "hardware",
        importance: "major",
        sourceType: "official-scrape",
        allDay: true,
      };
      const ics = generateCalendar([event]);
      expect(ics).toContain("X-ALT-DESC;FMTTYPE=TEXT/HTML:");
      // Folded ICS lines can break mid-URL, so check on the unfolded text.
      const unfolded = ics.replace(/\r\n /g, "");
      expect(unfolded).toContain('<a href="https://www.samsung.com/us/unpacked/">');
      expect(unfolded).toContain("Samsung's flagship Galaxy device launch event.");
    });

    it("omits X-ALT-DESC entirely when there is no description and no watchUrl", () => {
      const event: TechEvent = {
        id: "watch-5",
        title: "Some Event With No Description",
        start: new Date("2026-06-04T00:00:00Z"),
        category: "hardware",
        importance: "major",
        sourceType: "official-scrape",
        allDay: true,
      };
      const ics = generateCalendar([event]);
      expect(ics).not.toContain("X-ALT-DESC");
    });
  });
});
