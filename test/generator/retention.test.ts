import { describe, it, expect } from "vitest";
import { filterByRetention } from "../../src/generator/retention.js";
import { outputConfigs } from "../../src/generator/outputs.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

const NOW = new Date("2026-08-01T12:00:00Z");

function makeEvent(start: Date): TechEvent {
  return {
    id: "x",
    title: "x",
    start,
    category: "conference",
    importance: "normal",
    sourceType: "manual",
  };
}

describe("filterByRetention", () => {
  it("excludes an event from yesterday when retentionDaysPast is 0", () => {
    const yesterday = makeEvent(new Date("2026-07-31T23:00:00Z"));
    expect(filterByRetention([yesterday], 0, NOW)).toEqual([]);
  });

  it("includes an event from today when retentionDaysPast is 0, regardless of time-of-day", () => {
    // Earlier today than `now` — still "today," not "in the past."
    const earlierToday = makeEvent(new Date("2026-08-01T00:00:01Z"));
    expect(filterByRetention([earlierToday], 0, NOW)).toEqual([earlierToday]);
  });

  it("includes a future event when retentionDaysPast is 0", () => {
    const future = makeEvent(new Date("2026-08-02T00:00:00Z"));
    expect(filterByRetention([future], 0, NOW)).toEqual([future]);
  });

  it("supports a finite retention window wider than zero days", () => {
    const threeDaysAgo = makeEvent(new Date("2026-07-29T00:00:00Z"));
    const fourDaysAgo = makeEvent(new Date("2026-07-28T00:00:00Z"));
    const retained = filterByRetention([threeDaysAgo, fourDaysAgo], 3, NOW);
    expect(retained).toEqual([threeDaysAgo]);
  });

  it("keeps every event, including a decades-old one, when retentionDaysPast is Infinity (the history output)", () => {
    const ancient = makeEvent(new Date("2001-01-01T00:00:00Z"));
    const future = makeEvent(new Date("2030-01-01T00:00:00Z"));
    expect(filterByRetention([ancient, future], Infinity, NOW)).toEqual([ancient, future]);
  });

  it("returns an empty array unchanged", () => {
    expect(filterByRetention([], 0, NOW)).toEqual([]);
  });

  describe("wired through outputConfigs", () => {
    it("the default public 'calendar'/'upcoming' output has retentionDaysPast 0", () => {
      const calendar = outputConfigs.find((c) => c.name === "calendar");
      expect(calendar?.retentionDaysPast).toBe(0);

      const yesterday = makeEvent(new Date("2026-07-31T00:00:00Z"));
      const today = makeEvent(new Date("2026-08-01T00:00:00Z"));
      const future = makeEvent(new Date("2026-08-05T00:00:00Z"));
      const retained = filterByRetention([yesterday, today, future], calendar!.retentionDaysPast, NOW);
      expect(retained).toEqual([today, future]);
    });

    it("the 'history' output has retentionDaysPast Infinity and keeps past events", () => {
      const history = outputConfigs.find((c) => c.name === "history");
      expect(history?.retentionDaysPast).toBe(Infinity);

      const old = makeEvent(new Date("2019-01-01T00:00:00Z"));
      expect(filterByRetention([old], history!.retentionDaysPast, NOW)).toEqual([old]);
    });
  });
});
