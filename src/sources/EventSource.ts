import type { TechEvent } from "../models/TechEvent.js";

/**
 * How proven a source's implementation is — an engineering-confidence
 * axis, separate from DiscoveryMethod (how the source finds events) and
 * SourceType (the per-event output-confidence tier on TechEvent). Exists
 * because "reliability > completeness" means we want to know, at a
 * glance, which sources have actually been checked against a real event
 * as it happened versus which ones are still running on sound reasoning
 * alone.
 *
 * - "production": verified against at least one real live event cycle —
 *   the source's mechanism has been checked against genuine data from a
 *   real vendor announcement/event, not just a plausible-looking fixture.
 * - "experimental": implemented from sound evidence (a confirmed-live
 *   page/feed, a real selector) but not yet verified through a complete
 *   real-world event cycle — the mechanism is untested against the one
 *   condition it exists to handle (an actual upcoming announcement).
 * - "deprecated": known to work but scheduled for replacement (e.g. by a
 *   newly-verified event_page source), kept running until the
 *   replacement is proven.
 *
 * Optional and not set on every source — see README.md's "Source
 * maturity" section for the full table, including sources with no active
 * discovery mechanism at all (stubs), which this scale doesn't apply to.
 */
export type SourceMaturity = "production" | "experimental" | "deprecated";

export const VALID_SOURCE_MATURITIES: readonly SourceMaturity[] = [
  "production",
  "experimental",
  "deprecated",
];

/**
 * The single contract every event source implements. This is the
 * architecture's extension point: to add a new vendor, or to replace a
 * stub with a real scraper/API client, implement this interface in its
 * own file under src/sources and register it in src/providers/sourceRegistry.ts.
 * Nothing else in the pipeline needs to change.
 */
export interface EventSource {
  /** Human-readable name used in "Fetching X..." log output. Falls back to the class name if omitted. */
  readonly displayName?: string;
  /** Implementation-confidence tier — see SourceMaturity. */
  readonly maturity?: SourceMaturity;
  fetchEvents(): Promise<TechEvent[]>;
}
