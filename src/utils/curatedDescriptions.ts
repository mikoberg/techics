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

// Marketing qualifiers that describe a genuinely different launch phase
// or hardware variant — these must NEVER be normalized away, or distinct
// real-world launches (a China-only reveal vs. the later global rollout,
// a plain model vs. its Ultra/Pro/FE sibling) would wrongly collapse into
// one canonical title, and from there into one deduplicated calendar
// event. Checked as a whole-title scan (not just immediately after the
// model number) since geography qualifiers in particular tend to appear
// elsewhere in a raw headline ("...Debuts in China" / "...Global Launch
// Event"). Order of appearance in the source title is preserved so
// multi-qualifier titles read naturally ("Find X9 Ultra Global Launch").
const VARIANT_QUALIFIERS = ["Ultra", "Pro", "Plus", "Lite", "Fold", "FE", "China", "Global"] as const;
// Lookbehind/lookahead guard against hyphenated compound adjectives that
// happen to contain one of these words but aren't a product variant at
// all — the real, observed case is "Ultra-Slim Durability" in marketing
// copy, which must NOT be read as an "Ultra" model variant.
const VARIANT_QUALIFIER_PATTERN = new RegExp(`(?<!-)\\b(${VARIANT_QUALIFIERS.join("|")})\\b(?!-)`, "gi");

/**
 * Returns the distinct variant qualifiers found in a title, normalized
 * (FE uppercase, others title-cased) and in order of first appearance.
 * Exported so canonicalEventFilter.ts can use the exact same vocabulary
 * to decide whether two events in the same time cluster describe the
 * same launch variant or must be kept distinct (e.g. a "China" launch
 * vs. a "Global" launch) — one shared source of truth for what counts
 * as a meaningful variant, instead of two independently-maintained lists.
 */
export function extractVariantQualifiers(title: string): string[] {
  const found: string[] = [];
  for (const match of title.matchAll(VARIANT_QUALIFIER_PATTERN)) {
    const word = match[1]!;
    // "FE" is an initialism (kept all-caps); everything else is title-cased.
    const canonical = word.toUpperCase() === "FE" ? "FE" : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    if (!found.includes(canonical)) found.push(canonical);
  }
  return found;
}

/**
 * `exclude` skips qualifier words already encoded by whichever base
 * pattern matched (e.g. the HONOR "Magic{n} Pro" branch already puts
 * "Pro" in the base name — without excluding it here it would be
 * double-counted as "Magic8 Pro Pro Launch").
 */
function extractVariantSuffix(title: string, exclude: string[] = []): string {
  const excluded = new Set(exclude.map((word) => word.toLowerCase()));
  const found = extractVariantQualifiers(title).filter((word) => !excluded.has(word.toLowerCase()));
  return found.length > 0 ? ` ${found.join(" ")}` : "";
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
  // otherwise match both of those too. A variant suffix (e.g. "China"/
  // "Global") is appended to whichever base matched, so e.g. "Magic V6
  // China Launch" and "Magic V6 Global Launch" stay distinct.
  const magicV = /\bmagic\s?v(\d+)\b/i.exec(title)?.[1];
  if (magicV) return `HONOR Magic V${magicV}${extractVariantSuffix(title)} Launch`;
  const magicPro = /\bmagic\s?(\d+)\s*pro\b/i.exec(title)?.[1];
  if (magicPro) return `HONOR Magic${magicPro} Pro${extractVariantSuffix(title, ["Pro"])} Launch`;
  const magicSeries = /\bmagic\s?(\d+)\s*series\b/i.exec(title)?.[1];
  if (magicSeries) return `HONOR Magic${magicSeries} Series${extractVariantSuffix(title)} Launch`;
  const magic = /\bmagic\s?(\d+)\b/i.exec(title)?.[1];
  if (magic) return `HONOR Magic${magic}${extractVariantSuffix(title)} Launch`;
  const honorSeries = /\bhonor (\d+) series\b/i.exec(title)?.[1];
  if (honorSeries) return `HONOR ${honorSeries} Series${extractVariantSuffix(title)} Launch`;

  // vivo X-series. The variant suffix already captures FE/Ultra/Pro/Plus
  // (plus China/Global), so a dedicated adjacent-suffix capture isn't
  // needed separately — this also means "vivo X300" and "vivo X300 FE"
  // never collapse into the same canonical title.
  const vivoX = /\bx(\d{3})\b/i.exec(title)?.[1];
  if (vivoX) return `vivo X${vivoX}${extractVariantSuffix(title)} Launch`;

  // OPPO — Find N (foldables) and Find X (flagships) checked before the
  // bare Reno pattern, since a title could in principle mention both.
  const findN = /\bfind\s?n(\d+)\b/i.exec(title)?.[1];
  if (findN) return `OPPO Find N${findN}${extractVariantSuffix(title)} Launch`;
  const findX = /\bfind\s?x(\d+)\b/i.exec(title)?.[1];
  if (findX) return `OPPO Find X${findX}${extractVariantSuffix(title)} Launch`;
  const reno = /\breno\s?(\d+)\b/i.exec(title)?.[1];
  if (reno) return `OPPO Reno${reno}${extractVariantSuffix(title)} Launch`;

  return undefined;
}
