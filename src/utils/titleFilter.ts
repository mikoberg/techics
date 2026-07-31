/**
 * Shared exclude patterns applied across every newsroom-scraped source,
 * on top of each vendor's own include patterns. Real newsroom listings
 * mix genuine launches with sales/availability/variant/marketing posts
 * in the same feed (e.g. "vivo's Latest Compact Flagship X300 FE Goes On
 * Sale With Exciting Launch Offers" — contains "flagship" AND "launch"
 * but is a sales post, not a launch announcement) — so exclusion must be
 * checked, and must win, independently of inclusion.
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
 */
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
  // Interviews, software patches, and security advisories.
  /\binterview\b/i,
  /^\s*\[interview\]/i,
  /\bpatch(?:es)?\b/i,
  /\bsecurity advisory\b/i,
  /\bvulnerabilit(?:y|ies)\b/i,
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
