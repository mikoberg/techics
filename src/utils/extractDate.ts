const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_PATTERN = MONTHS.join("|");

// "September 9, 2027" / "September 9" / "Sep 9, 2027"
const LONG_DATE_RE = new RegExp(
  `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
  "i",
);

// ISO-style "2027-09-09"
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

/**
 * Extracts a single, unambiguous calendar date from free text. Returns
 * undefined rather than guessing when the text is vague ("this fall",
 * "later this year", no explicit day given, etc.) — callers must treat
 * undefined as "date not confirmed, do not emit an event."
 *
 * `referenceDate` (typically the feed item's publish date) is used only
 * to resolve a missing year, since articles frequently describe a date
 * without repeating the year ("the event takes place July 22" or "join us
 * September 9"). The resolution is deliberately conservative: try the
 * reference date's own year first — this correctly handles both
 * forward-looking announcements (published shortly before the date) and
 * retrospective/recap articles (published shortly after it, referencing a
 * date in the recent past). Only if that candidate falls implausibly far
 * in the past relative to the article (more than ~120 days before it) do
 * we roll forward to next year, since a same-year reading would then mean
 * the article is describing an event many months stale, which is far less
 * likely than the year having quietly rolled over (e.g. an article
 * published in December about a "January 5" event).
 */
export function extractConfidentDate(text: string, referenceDate: Date): Date | undefined {
  const isoMatch = ISO_DATE_RE.exec(text);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const longMatch = LONG_DATE_RE.exec(text);
  if (longMatch) {
    const [, monthName, dayStr, yearStr] = longMatch;
    const monthIndex = MONTHS.indexOf((monthName ?? "").toLowerCase());
    const day = Number(dayStr);
    if (monthIndex === -1 || !day) return undefined;

    if (yearStr) {
      const date = new Date(Date.UTC(Number(yearStr), monthIndex, day));
      if (!Number.isNaN(date.getTime())) return date;
      return undefined;
    }

    // No year given: try the reference date's own year first.
    const year = referenceDate.getUTCFullYear();
    const candidate = new Date(Date.UTC(year, monthIndex, day));

    const MAX_PLAUSIBLE_PAST_MS = 120 * 24 * 60 * 60 * 1000;
    if (referenceDate.getTime() - candidate.getTime() > MAX_PLAUSIBLE_PAST_MS) {
      return new Date(Date.UTC(year + 1, monthIndex, day));
    }
    return candidate;
  }

  return undefined;
}
