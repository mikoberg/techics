import { describe, it, expect } from "vitest";
import { matchesLaunchTitle, DEFAULT_EXCLUDE_PATTERNS } from "../../src/utils/titleFilter.js";

const INCLUDE = [/\bx\d{3}\b/i, /\bunveils\b/i, /\bdebuts\b/i];

describe("matchesLaunchTitle", () => {
  it("matches a title against an include pattern", () => {
    expect(matchesLaunchTitle("vivo X300 Ultra Debuts in India", INCLUDE)).toBe(true);
  });

  it("rejects a title matching no include pattern", () => {
    expect(matchesLaunchTitle("vivo Ignite 2026 Sparks Enthusiasm", INCLUDE)).toBe(false);
  });

  it("exclude wins over include, even when both match the same title", () => {
    const title = "vivo's Latest Compact Flagship X300 FE Goes On Sale With Exciting Launch Offers";
    expect(matchesLaunchTitle(title, INCLUDE)).toBe(false);
  });

  it("rejects sale/discount/variant/accessory/campaign wording via the default excludes", () => {
    expect(matchesLaunchTitle("vivo X300 Goes On Sale", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Price Cut Announced", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 New Color Variant Unveiled", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Accessory Bundle Now Available", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Campaign Debuts Today", INCLUDE)).toBe(false);
  });

  it("accepts a custom exclude list instead of the default", () => {
    expect(matchesLaunchTitle("X300 Debuts With Discount", INCLUDE, [])).toBe(true);
  });

  it("exports a non-empty default exclude list", () => {
    expect(DEFAULT_EXCLUDE_PATTERNS.length).toBeGreaterThan(0);
  });

  it("rejects interviews and software patch/security advisory posts", () => {
    expect(matchesLaunchTitle("[Interview] X300 Ultra Camera Team on Zeiss Partnership", INCLUDE)).toBe(
      false,
    );
    expect(matchesLaunchTitle("An Interview with the X300 Debuts Design Lead", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Security Patch Debuts for All Users", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Security Advisory: Debuts of a Fix", INCLUDE)).toBe(false);
  });

  it("rejects secondary regional rollout wording but keeps a first-reveal launch even when a region is named", () => {
    // First official launch reveal — kept, even though it names a region
    // (this is exactly vivo's real-world case: its only newsroom is India's).
    expect(matchesLaunchTitle("vivo X300 Ultra Debuts in India", INCLUDE)).toBe(true);
    expect(matchesLaunchTitle("HONOR Unveils Magic V6 in London", [/\bunveils\b/i])).toBe(true);

    // Secondary/follow-up rollout language for an already-launched product — excluded.
    expect(matchesLaunchTitle("X300 Ultra Now Available in Germany", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Rolling Out to More Markets", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Expands to Southeast Asia", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Coming Soon to the UK", INCLUDE)).toBe(false);
  });

  it("rejects real article-about-an-event titles: infographics, invitations, hands-on, awards/recognition, beta-support notes", () => {
    // Real titles observed live from Samsung's and Honor's newsrooms.
    expect(
      matchesLaunchTitle(
        "[Infographic] [Galaxy Unpacked July 2026] Highlights From Galaxy Unpacked",
        [/\bunpacked\b/i],
      ),
    ).toBe(false);
    expect(
      matchesLaunchTitle("[Invitation] Galaxy Unpacked July 2026: A New Shape Unfolds", [/\bunpacked\b/i]),
    ).toBe(false);
    expect(
      matchesLaunchTitle(
        "HONOR Earns Global Recognition at MWC 2026 for Robot Phone Innovation and HONOR Magic V6 Foldable Leadership",
        [/\bmagic\s?v\d/i],
      ),
    ).toBe(false);
    expect(
      matchesLaunchTitle("HONOR Magic8 Pro Among the First to Support Android 17 Beta 3 for Developers", [
        /\bmagic\s?\d/i,
      ]),
    ).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Hands-on: First Impressions", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Deep Dive: Camera Review", INCLUDE)).toBe(false);
    expect(matchesLaunchTitle("X300 Ultra Launch Recap: Everything Announced", INCLUDE)).toBe(false);
  });
});
