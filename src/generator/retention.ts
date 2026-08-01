import type { TechEvent } from "../models/TechEvent.js";

/**
 * Publication retention — deliberately NOT part of validation
 * (src/validation/validateEvents.ts). Validation answers "is this event
 * valid?" (a data-quality question, answered once for the whole merged
 * pool). Retention answers "should this event be included in *this*
 * output?" — a presentation question, answered per output, since
 * different outputs legitimately want different windows (the default
 * public calendars want today-or-later only; an archival "history"
 * output wants everything). Keeping them as separate modules/stages
 * means a retention change can never accidentally reject an otherwise
 * valid event from every output, and a validation change can never
 * accidentally start hiding events that are merely old.
 *
 * Comparison is by UTC calendar day, not exact instant — an event
 * timestamped earlier today should still count as "today," not "in the
 * past," regardless of what time of day the build happens to run.
 */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Keeps only events whose start date is within `retentionDaysPast` days
 * before `now` (inclusive of today) — or every event, when
 * `retentionDaysPast` is `Infinity` (e.g. an unbounded "history" output).
 *
 * `retentionDaysPast: 0` — the default for public-facing calendars — keeps
 * only events occurring today or later, dropping anything that has
 * already happened as of a previous day.
 */
export function filterByRetention(
  events: TechEvent[],
  retentionDaysPast: number,
  now: Date = new Date(),
): TechEvent[] {
  if (!Number.isFinite(retentionDaysPast)) return events;

  const cutoff = startOfUtcDay(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDaysPast);

  return events.filter((event) => startOfUtcDay(event.start) >= cutoff);
}
