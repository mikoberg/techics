/**
 * Shared exclude patterns applied across every source (both the
 * newsroom-HTML scrapers and the RSS/Atom feed sources), on top of each
 * vendor's own include patterns. Real newsroom/feed listings mix genuine
 * launches with sales/availability/variant/marketing posts and pure
 * media coverage in the same feed (e.g. "vivo's Latest Compact Flagship
 * X300 FE Goes On Sale With Exciting Launch Offers" — contains
 * "flagship" AND "launch" but is a sales post, not a launch
 * announcement) — so exclusion must be checked, and must win,
 * independently of inclusion.
 *
 * This list directly enforces RELEASE_POLICY.exclude in
 * src/policy/releasePolicy.ts — see that file and README.md's "Release
 * policy" section for the full mapping. Two exclude items are
 * deliberately NOT blanket title-text patterns:
 *   - "regional launches" — only secondary/follow-up rollout phrasing is
 *     excluded (below); a first-party official launch reveal is kept
 *     even from a regionally scoped newsroom (e.g. Vivo's India-only
 *     newsroom is authoritative for a device's initial launch there).
 *   - "blog posts" — every source already filters to launch-shaped
 *     titles only before this function ever runs, so general blog
 *     content is structurally excluded upstream, not by a text pattern.
 *
 * NOTE for software/OS release sources (e.g. google.ts's Android
 * release branch): don't use DEFAULT_EXCLUDE_PATTERNS as-is — "now
 * available"/"available now" is standard, legitimate phrasing for a
 * software rollout announcement ("Android 17 QPR1 Feature Drop is now
 * available"), not a hardware-sales availability notice. Those sources
 * should pass a custom exclude list built from DERIVATIVE_COVERAGE_PATTERNS
 * + SOFTWARE_SAFETY_EXCLUDE_PATTERNS instead (see google.ts).
 */

/**
 * Titles matching these patterns are *coverage of* an event, not the
 * event itself: interviews, infographics, invitations/save-the-dates,
 * hands-on/deep-dive impressions, media recaps, and awards/recognition
 * pieces. Exported separately (not just inlined into
 * DEFAULT_EXCLUDE_PATTERNS) because canonicalEventFilter.ts reuses the
 * exact same list when picking which of several near-duplicate titles
 * about the same real-world launch is the canonical one to keep, and
 * software-release sources reuse it to build a narrower exclude list.
 */
export const DERIVATIVE_COVERAGE_PATTERNS: RegExp[] = [
  /\binterview\b/i,
  /^\s*\[interview\]/i,
  /\binfographic\b/i,
  /^\s*\[infographic\]/i,
  /\binvitation\b/i,
  /^\s*\[invitation\]/i,
  /\bhands[- ]?on\b/i,
  /\bdeep dive\b/i,
  /\brecap\b/i,
  /\brecognition\b/i,
  /\bleadership\b/i,
  /\bawards?\b/i,
  /\bfirst to support\b/i,
  /\bsupports?\b[^.]*\bbeta\b/i,
];

/**
 * Semantic validation stage: "would a human reasonably put this on their
 * personal calendar?" A title can be launch-shaped by every mechanical
 * measure above (matches a product-name include pattern, isn't a sale/
 * interview/infographic) and still not be an event a person would want a
 * reminder for — generic trade-show-presence pieces, partnership
 * announcements, product reviews, and "ecosystem update" posts all
 * qualify without describing an actual release. Not a new pipeline stage
 * in code — these patterns feed into the same exclude mechanism used
 * everywhere else — but conceptually and editorially a distinct check
 * from "is this a launch title" (product-name matching) or "is this
 * coverage of an event" (DERIVATIVE_COVERAGE_PATTERNS above).
 *
 * `/\badvances? (?:its|their) .*\bvision\b/i` targets a real observed
 * case directly: "HONOR Advances Its AI Vision at MWC 2026 with Robot
 * Phone, Humanoid Robot and Magic V6" — mentions a real product name but
 * describes general AI strategy/trade-show presence, not a release.
 */
export const SEMANTIC_REJECTION_PATTERNS: RegExp[] = [
  /\bpartnership\b/i,
  /\breview\b/i,
  /\becosystem update\b/i,
  /\badvances? (?:its|their) .*\bvision\b/i,
  /\bavailability\b/i,
];

/**
 * Software-safety-note exclusions: patches and security advisories are
 * never events, for any source (hardware or software). Exported
 * separately so software-release sources can combine it with
 * DERIVATIVE_COVERAGE_PATTERNS without pulling in the hardware-marketing
 * patterns (sale/discount/variant/availability) below, which would
 * incorrectly reject legitimate software-rollout phrasing like "is now
 * available."
 */
export const SOFTWARE_SAFETY_EXCLUDE_PATTERNS: RegExp[] = [
  /\bpatch(?:es)?\b/i,
  /\bsecurity advisory\b/i,
  /\bvulnerabilit(?:y|ies)\b/i,
];

export const DEFAULT_EXCLUDE_PATTERNS: RegExp[] = [
  /\bgoes? on sale\b/i,
  /\bsale\b/i,
  /\bdiscount/i,
  /\boffers?\b/i,
  /\bprice cut\b/i,
  /\bvariant\b/i,
  /\bcolor(?:way)?\b/i,
  /\bcolour(?:way)?\b/i,
  /\baccessor(?:y|ies)\b/i,
  /\bcampaign\b/i,
  /\bpromotion/i,
  /\bavailable now\b/i,
  /\bnow available\b/i,
  // Secondary-market rollout language ("regional launches" policy item) —
  // distinct from first-reveal verbs like "Unveils"/"Debuts"/"Launches
  // the X Series", which are NOT excluded even when a region is named.
  /\bnow available in\b/i,
  /\brolling out to\b/i,
  /\barrives? in stores\b/i,
  /\bexpands? to\b/i,
  /\bcoming soon to\b/i,
  ...SOFTWARE_SAFETY_EXCLUDE_PATTERNS,
  // Articles ABOUT an event, not the event itself — see
  // DERIVATIVE_COVERAGE_PATTERNS's doc comment.
  ...DERIVATIVE_COVERAGE_PATTERNS,
  // "Would a human put this on their calendar?" — see
  // SEMANTIC_REJECTION_PATTERNS's doc comment.
  ...SEMANTIC_REJECTION_PATTERNS,
];

/**
 * A title qualifies only if it matches at least one include pattern and
 * matches none of the exclude patterns. Exclude always wins over
 * include — this is what keeps sales/marketing posts out even when they
 * happen to also mention a flagship product name.
 */
export function matchesLaunchTitle(
  title: string,
  include: RegExp[],
  exclude: RegExp[] = DEFAULT_EXCLUDE_PATTERNS,
): boolean {
  if (exclude.some((pattern) => pattern.test(title))) return false;
  return include.some((pattern) => pattern.test(title));
}
