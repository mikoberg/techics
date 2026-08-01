/**
 * Short, human-quality descriptions for the recurring event franchises
 * this project already targets. Tried first by every RSS/scrape source
 * before falling back to cleaned article text — a one-line curated
 * description ("Google's annual developer conference.") is far more
 * useful in a calendar/RSS/API than a truncated press-release excerpt.
 * Returns undefined for anything not recognized, so callers can fall back
 * gracefully rather than needing this list to be exhaustive.
 */
const CURATED_DESCRIPTIONS: Array<[RegExp, string]> = [
  [/\bgoogle i\/o\b/i, "Google's annual developer conference."],
  [/\bmade by google\b/i, "Google's annual hardware launch event for Pixel devices."],
  [/\bwwdc\d*\b/i, "Apple's annual Worldwide Developers Conference."],
  [/special event|keynote/i, "Apple hardware announcement event."],
  // Samsung's own event-page og:title reads "Samsung Unpacked", not
  // "Galaxy Unpacked" (confirmed live) — matching either.
  [/\b(?:galaxy|samsung) unpacked\b/i, "Samsung's flagship Galaxy device launch event."],
  [/\bmicrosoft build\b/i, "Microsoft's annual developer conference."],
  [/\bdevday\b/i, "OpenAI's annual developer event."],
  [/\bfeature drop\b/i, "Quarterly Android feature and security update."],
  [/\bandroid \d+ beta\b/i, "Public beta release of the next Android version."],
  [/\bandroid \d+ (?:is|qpr)/i, "Stable Android platform release."],
  [/\bmagic\s?v\d/i, "HONOR foldable flagship launch."],
  [/\bmagic\s?\d/i, "HONOR flagship phone launch."],
  [/\bhonor \d+ series\b/i, "HONOR flagship phone launch."],
  [/\bx\d{3}\b.*\b(?:unveils|debuts)\b|\b(?:unveils|debuts)\b.*\bx\d{3}\b/i, "vivo flagship phone launch."],
  [/\bfind\s?n\d/i, "OPPO foldable flagship launch."],
  [/\bfind\s?x\d/i, "OPPO flagship phone launch."],
  [/\breno\s?\d+/i, "OPPO Reno series phone launch."],
];

export function getCuratedDescription(title: string): string | undefined {
  for (const [pattern, description] of CURATED_DESCRIPTIONS) {
    if (pattern.test(title)) return description;
  }
  return undefined;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Generates a short, clean, canonical calendar title for the recurring
 * event franchises this project targets — e.g. "HONOR Magic V6 Launch"
 * instead of the raw newsroom headline "HONOR Launches Magic V6: The
 * Ultimate AI Foldable Flagship Blending Cross-Ecosystem Productivity
 * with Ultra-Slim Durability." Users should recognize every title
 * without reading the description.
 *
 * Ordered, first-match-wins, same shape as getCuratedDescription: returns
 * undefined for anything unrecognized so callers fall back to the raw
 * title rather than needing this table to be exhaustive.
 */
export function getCanonicalTitle(title: string, start: Date): string | undefined {
  const year = start.getUTCFullYear();

  // Android family — most specific first, since a title can contain more
  // than one of these words together (e.g. a QPR beta that's also framed
  // as a feature drop).
  const androidVersion = /\bandroid (\d+)\b/i.exec(title)?.[1];
  if (androidVersion) {
    if (/\bfeature drop\b/i.test(title)) return `Android ${androidVersion} Feature Drop`;
    if (/\bbeta\b/i.test(title)) return `Android ${androidVersion} Beta`;
    return `Android ${androidVersion} Stable Release`;
  }

  if (/\bgoogle i\/o\b/i.test(title)) return `Google I/O ${year}`;
  if (/\bmade by google\b/i.test(title)) return `Made by Google ${year}`;
  if (/\bwwdc\d*\b/i.test(title)) return `Apple WWDC ${year}`;
  if (/special event|keynote/i.test(title)) return `Apple Special Event ${year}`;
  if (/\b(?:galaxy|samsung) unpacked\b/i.test(title))
    return `Samsung Galaxy Unpacked ${MONTH_NAMES[start.getUTCMonth()]} ${year}`;
  if (/\bmicrosoft build\b/i.test(title)) return `Microsoft Build ${year}`;
  if (/\bdevday\b/i.test(title)) return `OpenAI DevDay ${year}`;

  // HONOR — check the most specific product-name shape first (Magic V{n}
  // and Magic{n} Pro) before the bare Magic{n} pattern, which would
  // otherwise match both of those too.
  const magicV = /\bmagic\s?v(\d+)\b/i.exec(title)?.[1];
  if (magicV) return `HONOR Magic V${magicV} Launch`;
  const magicPro = /\bmagic\s?(\d+)\s*pro\b/i.exec(title)?.[1];
  if (magicPro) return `HONOR Magic${magicPro} Pro Launch`;
  const magicSeries = /\bmagic\s?(\d+)\s*series\b/i.exec(title)?.[1];
  if (magicSeries) return `HONOR Magic${magicSeries} Series Launch`;
  const magic = /\bmagic\s?(\d+)\b/i.exec(title)?.[1];
  if (magic) return `HONOR Magic${magic} Launch`;
  const honorSeries = /\bhonor (\d+) series\b/i.exec(title)?.[1];
  if (honorSeries) return `HONOR ${honorSeries} Series Launch`;

  // vivo X-series, with an optional suffix (FE/Ultra/Pro/Plus).
  const vivoX = /\bx(\d{3})\s*(fe|ultra|pro|plus)?\b/i.exec(title);
  if (vivoX?.[1]) {
    const suffix = vivoX[2]?.toLowerCase();
    // "FE" is an initialism (kept all-caps); Ultra/Pro/Plus are title-cased.
    const suffixLabel = suffix
      ? ` ${suffix === "fe" ? "FE" : `${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`}`
      : "";
    return `vivo X${vivoX[1]}${suffixLabel} Launch`;
  }

  // OPPO — Find N (foldables) and Find X (flagships) checked before the
  // bare Reno pattern, since a title could in principle mention both.
  const findN = /\bfind\s?n(\d+)\b/i.exec(title)?.[1];
  if (findN) return `OPPO Find N${findN} Launch`;
  const findX = /\bfind\s?x(\d+)\b/i.exec(title)?.[1];
  if (findX) return `OPPO Find X${findX} Launch`;
  const reno = /\breno\s?(\d+)\b/i.exec(title)?.[1];
  if (reno) return `OPPO Reno${reno} Launch`;

  return undefined;
}
