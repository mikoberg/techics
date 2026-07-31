import type { TechEvent } from "../models/TechEvent.js";
import { VALID_CATEGORIES, VALID_IMPORTANCE } from "../models/TechEvent.js";
import { generateEventId } from "../utils/hash.js";

export interface ValidationIssue {
  event: TechEvent;
  reasons: string[];
}

export interface ValidationReport {
  published: TechEvent[];
  rejected: ValidationIssue[];
  duplicates: TechEvent[];
  warnings: ValidationIssue[];
}

const MIN_PLAUSIBLE_DATE = () => new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
const MAX_PLAUSIBLE_DATE = () => new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);

/**
 * Runs a single pre-publish validation pass over the full merged event
 * pool, before any ICS/API/RSS output is generated. This is the only
 * place that has visibility into what got rejected or deduplicated and
 * why — individual sources validate their own inputs, and validateIcs()
 * checks the *generated ICS structure*, but nothing previously checked
 * the merged pool itself. An event that fails a rejection rule is
 * excluded from every output; a warning-level issue still gets
 * published, just flagged in the build report.
 */
export function validateEvents(events: TechEvent[]): ValidationReport {
  const rejected: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const duplicates: TechEvent[] = [];
  const published: TechEvent[] = [];
  const seenIds = new Set<string>();

  for (const event of events) {
    const rejectReasons = getRejectReasons(event);
    if (rejectReasons.length > 0) {
      rejected.push({ event, reasons: rejectReasons });
      continue;
    }

    const id = generateEventId(event.category, event.title, event.start);
    if (seenIds.has(id)) {
      duplicates.push(event);
      continue;
    }
    seenIds.add(id);

    const warnReasons = getWarnReasons(event);
    if (warnReasons.length > 0) {
      warnings.push({ event, reasons: warnReasons });
    }

    published.push(event);
  }

  return { published, rejected, duplicates, warnings };
}

function getRejectReasons(event: TechEvent): string[] {
  const reasons: string[] = [];

  if (!event.title.trim()) reasons.push("empty title");

  if (Number.isNaN(event.start.getTime())) {
    reasons.push("invalid start date");
  } else if (event.start < MIN_PLAUSIBLE_DATE() || event.start > MAX_PLAUSIBLE_DATE()) {
    reasons.push(`implausible start date (${event.start.toISOString()})`);
  }

  if (event.end !== undefined) {
    if (Number.isNaN(event.end.getTime())) {
      reasons.push("invalid end date");
    } else if (event.end < event.start) {
      reasons.push("end date before start date");
    }
  }

  if (!VALID_CATEGORIES.includes(event.category)) {
    reasons.push(`invalid category "${event.category}"`);
  }

  if (!VALID_IMPORTANCE.includes(event.importance)) {
    reasons.push(`invalid importance "${event.importance}"`);
  }

  if (event.url !== undefined && !isValidHttpUrl(event.url)) {
    reasons.push(`malformed url "${event.url}"`);
  }

  return reasons;
}

function getWarnReasons(event: TechEvent): string[] {
  const reasons: string[] = [];
  if (event.url === undefined) reasons.push("missing official url");
  if (event.description === undefined) reasons.push("missing description");
  return reasons;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
