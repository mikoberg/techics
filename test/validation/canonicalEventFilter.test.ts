import { describe, it, expect } from "vitest";
import { filterCanonicalEvents } from "../../src/validation/canonicalEventFilter.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "hardware-x",
    title: "HONOR Launches Magic V5",
    description: "HONOR foldable flagship launch.",
    start: new Date("2025-08-25T00:00:00Z"),
    url: "https://www.honor.com/global/news/magic-v5/",
    category: "hardware",
    importance: "major",
    company: "HONOR",
    sourceType: "official-scrape",
    ...overrides,
  };
}

describe("filterCanonicalEvents", () => {
  it("passes a single event through untouched", () => {
    const event = makeEvent();
    const result = filterCanonicalEvents([event]);
    expect(result.kept).toEqual([event]);
    expect(result.rejected).toHaveLength(0);
  });

  it("collapses two launch-shaped titles about the same real-world event, days apart, into one", () => {
    // Real-world case: HONOR Magic V5 teaser (Aug 25) and its Western
    // Europe rollout (Aug 28), three days apart.
    const teaser = makeEvent({
      id: "hardware-1",
      title: "HONOR to Revolutionize AI-Powered Productivity on Foldable Phones with the HONOR Magic V5",
      start: new Date("2025-08-25T00:00:00Z"),
    });
    const rollout = makeEvent({
      id: "hardware-2",
      title: "HONOR Launches the Thinnest Zero-compromise Book-style Foldable Magic V5 in Western Europe",
      start: new Date("2025-08-28T00:00:00Z"),
    });

    const result = filterCanonicalEvents([teaser, rollout]);

    expect(result.kept).toHaveLength(1);
    // The event should describe the first official announcement only —
    // the rollout is a secondary regional availability announcement
    // ("in Western Europe"), so the non-regional teaser wins even though
    // it uses vaguer wording than the rollout's explicit "Launches" verb.
    expect(result.kept[0]?.title).toBe(teaser.title);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.event.title).toBe(rollout.title);
    expect(result.rejected[0]?.keptInstead.title).toBe(teaser.title);
  });

  it("does not merge two events for the same company that are months apart (a genuinely separate milestone)", () => {
    // Real-world case: HONOR's MWC Magic V6 coverage in March vs. the
    // actual Magic V6 launch in June — three months apart, not the same
    // announcement window.
    const mwc = makeEvent({
      id: "hardware-mwc",
      title: "HONOR Advances Its AI Vision at MWC 2026 with Robot Phone, Humanoid Robot and Magic V6",
      start: new Date("2026-03-01T00:00:00Z"),
    });
    const launch = makeEvent({
      id: "hardware-launch",
      title: "HONOR Launches Magic V6: The Ultimate AI Foldable Flagship",
      start: new Date("2026-06-04T00:00:00Z"),
    });

    const result = filterCanonicalEvents([mwc, launch]);

    expect(result.kept).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it("groups by category when company is unset", () => {
    const { company: _c1, ...restA } = makeEvent({ id: "a", start: new Date("2027-01-01T00:00:00Z") });
    const { company: _c2, ...restB } = makeEvent({ id: "b", start: new Date("2027-01-05T00:00:00Z") });
    const a = { ...restA, category: "conference" } as TechEvent;
    const b = { ...restB, category: "conference" } as TechEvent;
    const result = filterCanonicalEvents([a, b]);
    expect(result.kept).toHaveLength(1);
  });

  it("does not merge events from different companies even if close in time", () => {
    const honor = makeEvent({ id: "h1", company: "HONOR", start: new Date("2027-01-01T00:00:00Z") });
    const vivo = makeEvent({ id: "v1", company: "vivo", start: new Date("2027-01-02T00:00:00Z") });
    const result = filterCanonicalEvents([honor, vivo]);
    expect(result.kept).toHaveLength(2);
  });

  it("prefers the earliest event when none of the cluster uses a primary launch verb", () => {
    const first = makeEvent({
      id: "first",
      title: "HONOR Magic V5 Teased Ahead of Announcement",
      start: new Date("2025-08-20T00:00:00Z"),
    });
    const second = makeEvent({
      id: "second",
      title: "HONOR Magic V5 Rumored Specs Surface Online",
      start: new Date("2025-08-22T00:00:00Z"),
    });
    const result = filterCanonicalEvents([second, first]);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.title).toBe(first.title);
  });

  it("prefers a primary-launch-verb title over an earlier derivative-coverage title in the same cluster", () => {
    const recap = makeEvent({
      id: "recap",
      title: "HONOR Magic V5 Launch Recap: Everything Announced",
      start: new Date("2025-08-24T00:00:00Z"),
    });
    const launch = makeEvent({
      id: "launch",
      title: "HONOR Unveils Magic V5",
      start: new Date("2025-08-25T00:00:00Z"),
    });
    const result = filterCanonicalEvents([recap, launch]);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.title).toBe(launch.title);
  });

  it("handles an empty input array", () => {
    const result = filterCanonicalEvents([]);
    expect(result.kept).toEqual([]);
    expect(result.rejected).toEqual([]);
  });
});
