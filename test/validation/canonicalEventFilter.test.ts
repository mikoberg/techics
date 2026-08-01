import { describe, it, expect } from "vitest";
import { filterCanonicalEvents } from "../../src/validation/canonicalEventFilter.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "hardware-x",
    title: "HONOR Magic V5 Launch",
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

  it("collapses two articles about the same real-world launch, days apart, into one — keeping the earliest", () => {
    // Real-world case: every source calls getCanonicalTitle before
    // constructing a TechEvent, so a teaser (Aug 25) and a same-product
    // follow-up (Aug 28) both already read as "HONOR Magic V5 Launch" by
    // the time they reach this function — identical titles, not raw
    // press-release wording.
    const teaser = makeEvent({ id: "hardware-1", start: new Date("2025-08-25T00:00:00Z") });
    const followUp = makeEvent({ id: "hardware-2", start: new Date("2025-08-28T00:00:00Z") });

    const result = filterCanonicalEvents([teaser, followUp]);

    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.id).toBe(teaser.id);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.event.id).toBe(followUp.id);
    expect(result.rejected[0]?.keptInstead.id).toBe(teaser.id);
  });

  it("does not merge two same-title events for the same company that are months apart (a genuinely separate milestone)", () => {
    // Even with an identical canonical title, a gap far beyond the 14-day
    // cluster window (e.g. a March teaser vs. a June launch) must not merge.
    const early = makeEvent({ id: "hardware-early", start: new Date("2026-03-01T00:00:00Z") });
    const later = makeEvent({ id: "hardware-later", start: new Date("2026-06-04T00:00:00Z") });

    const result = filterCanonicalEvents([early, later]);

    expect(result.kept).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it("does not merge two DIFFERENT products from the same company even when close in time — the exact bug found via live testing", () => {
    // Real bug found running OppoSource against live data: grouping by
    // company alone let an unrelated "OPPO Find X6 Launch" merge with
    // "OPPO Find N2 Launch" just because they launched within the 14-day
    // window. Company alone was never enough to establish "same launch."
    const findX6 = makeEvent({
      id: "findx6",
      company: "OPPO",
      title: "OPPO Find X6 Launch",
      start: new Date("2023-03-21T00:00:00Z"),
    });
    const findN2 = makeEvent({
      id: "findn2",
      company: "OPPO",
      title: "OPPO Find N2 Launch",
      start: new Date("2023-03-25T00:00:00Z"),
    });
    const result = filterCanonicalEvents([findX6, findN2]);
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

  it("handles an empty input array", () => {
    const result = filterCanonicalEvents([]);
    expect(result.kept).toEqual([]);
    expect(result.rejected).toEqual([]);
  });

  describe("Event Enrichment Part 3: variant/geography-aware duplicate detection", () => {
    it("does NOT merge a China launch and a Global launch, even close in time and same company", () => {
      const china = makeEvent({
        id: "findx9-china",
        company: "OPPO",
        title: "OPPO Find X9 China Launch",
        start: new Date("2026-09-01T00:00:00Z"),
      });
      const global = makeEvent({
        id: "findx9-global",
        company: "OPPO",
        title: "OPPO Find X9 Global Launch",
        start: new Date("2026-09-10T00:00:00Z"),
      });
      const result = filterCanonicalEvents([china, global]);
      expect(result.kept).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });

    it("DOES merge two articles describing the exact same China launch", () => {
      const teaser = makeEvent({
        id: "findx9-china-teaser",
        company: "OPPO",
        title: "OPPO Find X9 China Launch",
        start: new Date("2026-09-01T00:00:00Z"),
      });
      const recap = makeEvent({
        id: "findx9-china-recap",
        company: "OPPO",
        title: "OPPO Find X9 China Launch",
        start: new Date("2026-09-03T00:00:00Z"),
      });
      const result = filterCanonicalEvents([teaser, recap]);
      expect(result.kept).toHaveLength(1);
      expect(result.rejected).toHaveLength(1);
    });

    it("does NOT merge a plain model launch and its Ultra sibling", () => {
      const base = makeEvent({
        id: "findx9-base",
        company: "OPPO",
        title: "OPPO Find X9 Launch",
        start: new Date("2026-09-01T00:00:00Z"),
      });
      const ultra = makeEvent({
        id: "findx9-ultra",
        company: "OPPO",
        title: "OPPO Find X9 Ultra Launch",
        start: new Date("2026-09-02T00:00:00Z"),
      });
      const result = filterCanonicalEvents([base, ultra]);
      expect(result.kept).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });

    it("does NOT merge Galaxy S26 and Galaxy S26 FE, even close in time and same company", () => {
      const base = makeEvent({
        id: "s26-base",
        company: "Samsung",
        title: "Galaxy S26",
        start: new Date("2027-01-20T00:00:00Z"),
      });
      const fe = makeEvent({
        id: "s26-fe",
        company: "Samsung",
        title: "Galaxy S26 FE",
        start: new Date("2027-01-25T00:00:00Z"),
      });
      const result = filterCanonicalEvents([base, fe]);
      expect(result.kept).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });

    it("does NOT merge a Fold variant and the unqualified base model", () => {
      const fold = makeEvent({
        id: "findx9-fold",
        company: "OPPO",
        title: "OPPO Find X9 Fold Launch",
        start: new Date("2026-09-01T00:00:00Z"),
      });
      const plain = makeEvent({
        id: "findx9-plain",
        company: "OPPO",
        title: "OPPO Find X9 Launch",
        start: new Date("2026-09-05T00:00:00Z"),
      });
      const result = filterCanonicalEvents([fold, plain]);
      expect(result.kept).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });
  });
});
