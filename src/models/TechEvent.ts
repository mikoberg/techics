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

/**
 * How the *event itself* was discovered — a separate axis from SourceType
 * (which is about output confidence/provenance). Introduced because
 * "newsroom" and "event_page" are fundamentally different in character
 * for a forward-looking calendar even though both currently map to
 * sourceType "official-scrape": a newsroom article is published when (or
 * after) an event happens, while a dedicated event page (e.g. Apple
 * Events, Microsoft Build, Samsung Unpacked) is a vendor-maintained,
 * evergreen page that gets updated *ahead of* the event with the
 * confirmed date — the source of first choice for a calendar whose whole
 * purpose is advance notice. "sitemap" covers per-article discovery via a
 * vendor's sitemap (e.g. OPPO) where individual pages are still newsroom
 * articles in character, just discovered a different way. Optional and
 * not backfilled onto every existing source — set by sources that have
 * gone through this classification exercise.
 */
export type DiscoveryMethod = "newsroom" | "event_page" | "sitemap" | "manual";

export const VALID_DISCOVERY_METHODS: readonly DiscoveryMethod[] = [
  "newsroom",
  "event_page",
  "sitemap",
  "manual",
];

export interface TechEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
  /** The source article/page this event's data was extracted from. */
  url?: string;
  /**
   * The URL a user should actually visit on the day of the event —
   * not necessarily the same as `url`. Priority order sources should
   * follow when setting this: (1) an official livestream page, (2) an
   * official event page, (3) an official keynote page, (4) an official
   * registration page, (5) the original announcement article (i.e. the
   * same value as `url`) as a fallback. For event_page sources (Apple,
   * Microsoft Build, Samsung Unpacked) this is the same page as `url`,
   * since the source already *is* the event page. For newsroom/sitemap
   * sources with no dedicated event page (Honor, OPPO, vivo), this is
   * also the same as `url` — the announcement article is the best
   * available destination. Rendered in ICS DESCRIPTION/X-ALT-DESC (see
   * generateCalendar.ts) and exposed in the JSON API.
   */
  watchUrl?: string;
  category: Category;
  importance: Importance;
  /** The manufacturer/organization this event belongs to, e.g. "Samsung", "HONOR". */
  company?: string;
  /** Where this event's data came from — see SourceType. */
  sourceType: SourceType;
  /** How this event was discovered — see DiscoveryMethod. Optional; not every source sets it yet. */
  discoveryMethod?: DiscoveryMethod;
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
  /** Optional override for the official watch-on-the-day link; defaults to `url` when omitted. */
  watchUrl?: string;
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
