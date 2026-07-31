/**
 * The project's editorial policy, as a first-class, documented constant —
 * not just prose in the README. This is what src/utils/titleFilter.ts's
 * DEFAULT_EXCLUDE_PATTERNS and every source's per-vendor INCLUDE_PATTERNS
 * exist to enforce. See README.md's "Release policy" section for the
 * full include -> pattern and exclude -> pattern mapping.
 *
 * One category, "chip launches", is included here for completeness of
 * the policy taxonomy but has no source implementing it today (no
 * chip-vendor newsroom has been evaluated yet) — listed honestly rather
 * than silently ignored.
 */
export interface ReleasePolicy {
  include: string[];
  exclude: string[];
}

export const RELEASE_POLICY: ReleasePolicy = {
  include: [
    "flagship smartphones",
    "foldables",
    "major OS releases",
    "major OS betas",
    "feature drops",
    "developer conferences",
    "AI conferences",
    "chip launches",
  ],
  exclude: [
    // "Regional launches" means secondary/follow-up rollouts of an
    // already-announced product (e.g. "...launches in Western Europe"
    // for a device that already had its global reveal) — NOT a first
    // official launch announcement, even one published by a regionally
    // scoped official newsroom. If the only official source for a
    // manufacturer is regional (e.g. Vivo's newsroom is India-only),
    // that source is authoritative for the initial launch, and its
    // "Debuts"/"Unveils"/"Launches the X Series" reveal is still
    // included. See src/utils/titleFilter.ts for the enforcement.
    "regional launches",
    "availability announcements",
    "colour variants",
    "accessories",
    "interviews",
    "promotions",
    "discounts",
    "software patches",
    "security advisories",
    "blog posts",
  ],
};
