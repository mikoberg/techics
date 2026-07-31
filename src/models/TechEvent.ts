export type Category =
  | "android"
  | "apple"
  | "google"
  | "microsoft"
  | "ai"
  | "hardware"
  | "conference";

export type Importance = "major" | "normal";

/**
 * How confident/trustworthy this event's data is, in order of decreasing
 * reliability: an official RSS/Atom feed, an official newsroom page we
 * scrape with CSS selectors, or a human-curated manual.json entry. Used
 * by the validation pipeline and the build report — not by the ICS/API
 * output, which treats every published event as equally confirmed.
 */
export type SourceType = "official-feed" | "official-scrape" | "manual";

export const VALID_SOURCE_TYPES: readonly SourceType[] = ["official-feed", "official-scrape", "manual"];

export interface TechEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
  url?: string;
  category: Category;
  importance: Importance;
  /** The manufacturer/organization this event belongs to, e.g. "Samsung", "HONOR". */
  company?: string;
  /** Where this event's data came from — see SourceType. */
  sourceType: SourceType;
  /**
   * True when only a calendar date is known (no real announced time),
   * e.g. text-extracted dates and HTML-scraped press dates. Emitted as an
   * RFC5545 all-day (VALUE=DATE) event instead of a fabricated midnight
   * timestamp, which would otherwise render as the wrong calendar day in
   * timezones west of UTC.
   */
  allDay?: boolean;
  /**
   * RFC5545 SEQUENCE — how many times this event's content has changed
   * since it was first published. Computed deterministically from a
   * content hash compared against the previous build's output (see
   * src/generator/sequenceTracker.ts); never random, never set by a
   * source directly. Defaults to 0 when absent.
   */
  sequence?: number;
}

/**
 * Raw shape of an entry in data/manual.json, before it is mapped into a
 * TechEvent. `id` is intentionally absent here — it is always derived
 * deterministically from category+title+date, never hand-authored.
 */
export interface ManualEventInput {
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  url?: string;
  location?: string;
  category: Category;
  importance?: Importance;
  company?: string;
  /**
   * Required, explicit human confirmation that this event is officially
   * confirmed — distinct from merely having a plausible-looking date.
   * An entry with confirmed: false (or missing — the field is required,
   * so "missing" only happens via a malformed file) is never published;
   * it's tracked here deliberately, not a data bug.
   */
  confirmed: boolean;
}

export const VALID_CATEGORIES: readonly Category[] = [
  "android",
  "apple",
  "google",
  "microsoft",
  "ai",
  "hardware",
  "conference",
];

export const VALID_IMPORTANCE: readonly Importance[] = ["major", "normal"];
