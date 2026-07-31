import type { TechEvent } from "../models/TechEvent.js";
import { DERIVATIVE_COVERAGE_PATTERNS } from "../utils/titleFilter.js";

export interface CanonicalDuplicate {
  event: TechEvent;
  keptInstead: TechEvent;
}

export interface CanonicalFilterResult {
  kept: TechEvent[];
  rejected: CanonicalDuplicate[];
}

const CLUSTER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// A title reads as the primary launch announcement itself (not coverage
// about one) when it uses an explicit reveal verb.
const PRIMARY_LAUNCH_VERBS = /\b(?:launches?|unveils?|debuts?|announces?)\b/i;

// Named-region trailing phrases that mark a title as a secondary/
// follow-up regional rollout rather than the first official announcement
// (e.g. "...in Western Europe" for a phone already revealed elsewhere).
// Kept small and specific to the regions actually observed live, rather
// than a broad "in <Capitalized Word>" pattern that would false-positive
// on legitimate title text.
const REGIONAL_ROLLOUT_PATTERN =
  /\bin (?:western europe|eastern europe|europe|india|china|the uk|the united kingdom|the us|the united states|north america|southeast asia|latin america)\b/i;

/**
 * Collapses multiple articles about the same real-world launch into one.
 * Per-title exclusion (titleFilter.ts) already removes obvious article-
 * *types* (interviews, infographics, etc.) — but two genuinely
 * launch-shaped titles can still both refer to the same event (e.g. a
 * teaser and the follow-up regional rollout of the same phone, days
 * apart). This is the second, complementary mechanism: group events by
 * vendor, cluster by rolling time proximity, and keep only the one
 * title per cluster that most reads as the actual announcement.
 *
 * Grouping by company (falling back to category) and a 14-day rolling
 * window — rather than a fixed calendar bucket — is what correctly
 * merges the close-together case (days apart) without false-merging
 * genuinely distinct milestones for the same product line that are
 * months apart (e.g. an MWC preview in March vs. the real launch in
 * June): a fixed month/week bucket would either split the former or
 * merge the latter depending on where the boundary happened to fall.
 *
 * Applied once, centrally, on the full merged pool — never per-source —
 * so every vendor is treated identically without touching source files.
 */
export function filterCanonicalEvents(events: TechEvent[]): CanonicalFilterResult {
  const groups = new Map<string, TechEvent[]>();
  for (const event of events) {
    const key = event.company ?? event.category;
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
      const survivor = pickCanonical(cluster);
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

function isDerivativeCoverage(title: string): boolean {
  return DERIVATIVE_COVERAGE_PATTERNS.some((pattern) => pattern.test(title));
}

function isRegionalRollout(title: string): boolean {
  return REGIONAL_ROLLOUT_PATTERN.test(title);
}

/**
 * Picks which event in a cluster is the canonical launch: the event
 * should describe the first official announcement only, never a
 * secondary regional rollout — so a non-regional title always wins over
 * a regional one within the same cluster, regardless of verb strength.
 * The exception (matching the principle already established for sources
 * like Vivo, whose only public newsroom is India's): if *every* title in
 * the cluster is regionally scoped, that region is the sole record of
 * the launch and is kept rather than discarding the whole cluster.
 *
 * Within whichever set applies, prefer a title using a primary launch
 * verb that isn't also derivative coverage, then the earliest by date
 * (the announcement precedes hands-on/recap coverage in the real world).
 */
function pickCanonical(cluster: TechEvent[]): TechEvent {
  if (cluster.length === 1) return cluster[0]!;

  const nonRegional = cluster.filter((event) => !isRegionalRollout(event.title));
  const candidates = nonRegional.length > 0 ? nonRegional : cluster;

  const primaryCandidates = candidates.filter(
    (event) => PRIMARY_LAUNCH_VERBS.test(event.title) && !isDerivativeCoverage(event.title),
  );

  const pool = primaryCandidates.length > 0 ? primaryCandidates : candidates;
  return [...pool].sort((a, b) => a.start.getTime() - b.start.getTime())[0]!;
}
