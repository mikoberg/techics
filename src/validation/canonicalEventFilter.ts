import type { TechEvent } from "../models/TechEvent.js";

export interface CanonicalDuplicate {
  event: TechEvent;
  keptInstead: TechEvent;
}

export interface CanonicalFilterResult {
  kept: TechEvent[];
  rejected: CanonicalDuplicate[];
}

const CLUSTER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Collapses multiple articles about the same real-world launch into one.
 * Per-title exclusion (titleFilter.ts) already removes obvious article-
 * *types* (interviews, infographics, recaps, etc.) before a source even
 * constructs a TechEvent — but a genuine launch can still get more than
 * one qualifying article (a teaser and a same-product follow-up, days
 * apart). This is the second, complementary mechanism: group events by
 * vendor *and exact title*, cluster by rolling time proximity within each
 * group, and keep the earliest one per cluster.
 *
 * Grouping by (company, title) rather than company alone is what makes
 * this consider canonical title, launch variant, and geography, not just
 * event date — and, critically, the base product itself. Every source
 * calls getCanonicalTitle (curatedDescriptions.ts) before constructing a
 * TechEvent, so by the time events reach this function their titles are
 * already canonical: "OPPO Find X9 China Launch" and "OPPO Find X9 Global
 * Launch" are already different strings (different groups, both kept);
 * two articles about the *same* China launch already share the identical
 * canonical title (same group, correctly collapse into one). This also
 * fixes a real bug found via live testing: grouping by company alone let
 * two entirely unrelated products from the same vendor (e.g. "OPPO Find
 * X6 Launch" and "OPPO Find N2 Launch") merge just because they happened
 * to launch within the 14-day window — company alone was never enough to
 * establish "same launch," only "same vendor." Titles getCanonicalTitle
 * doesn't recognize (raw title kept verbatim, e.g. "Galaxy S26" vs.
 * "Galaxy S26 FE") are naturally distinct strings too, so the same
 * grouping separates them without any special casing.
 *
 * Within a (company, title) group — which, by construction, only ever
 * contains events describing literally the same announcement — a 14-day
 * rolling window (rather than a fixed calendar bucket) is what correctly
 * merges the close-together case without false-merging genuinely
 * distinct milestones for the same product line that are months apart
 * (e.g. an MWC preview in March vs. the real launch in June, which would
 * carry different canonical titles anyway since they read as different
 * announcements). The earliest event in a cluster is kept — the
 * announcement precedes any later coverage in the real world.
 *
 * Applied once, centrally, on the full merged pool — never per-source —
 * so every vendor is treated identically without touching source files.
 */
export function filterCanonicalEvents(events: TechEvent[]): CanonicalFilterResult {
  const groups = new Map<string, TechEvent[]>();
  for (const event of events) {
    const key = `${event.company ?? event.category}::${event.title}`;
    const group = groups.get(key);
    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  const kept: TechEvent[] = [];
  const rejected: CanonicalDuplicate[] = [];

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.start.getTime() - b.start.getTime());

    let cluster: TechEvent[] = [];
    const flushCluster = () => {
      if (cluster.length === 0) return;
      // Every member shares the identical title by construction, so the
      // earliest occurrence is unambiguously the one to keep.
      const survivor = cluster[0]!;
      kept.push(survivor);
      for (const event of cluster) {
        if (event !== survivor) rejected.push({ event, keptInstead: survivor });
      }
      cluster = [];
    };

    for (const event of sorted) {
      const last = cluster[cluster.length - 1];
      if (last && event.start.getTime() - last.start.getTime() > CLUSTER_WINDOW_MS) {
        flushCluster();
      }
      cluster.push(event);
    }
    flushCluster();
  }

  return { kept, rejected };
}
