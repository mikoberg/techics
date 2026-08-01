import { describe, it, expect } from "vitest";
import {
  getCuratedDescription,
  getCanonicalTitle,
  extractVariantQualifiers,
} from "../../src/utils/curatedDescriptions.js";

describe("getCuratedDescription", () => {
  it("returns a short curated description for known recurring franchises", () => {
    expect(getCuratedDescription("Everything we announced at Google I/O")).toBe(
      "Google's annual developer conference.",
    );
    expect(getCuratedDescription("Apple sets WWDC26 dates")).toBe(
      "Apple's annual Worldwide Developers Conference.",
    );
    expect(getCuratedDescription("Samsung Galaxy Unpacked to Take Place on January 20")).toBe(
      "Samsung's flagship Galaxy device launch event.",
    );
    expect(getCuratedDescription("Microsoft Build 2027 dates announced")).toBe(
      "Microsoft's annual developer conference.",
    );
    expect(getCuratedDescription("Join us for OpenAI DevDay on October 15")).toBe(
      "OpenAI's annual developer event.",
    );
    expect(getCuratedDescription("Android 17 QPR1 Feature Drop is now available")).toBe(
      "Quarterly Android feature and security update.",
    );
    expect(getCuratedDescription("HONOR Launches Magic V6: The Ultimate AI Foldable Flagship")).toBe(
      "HONOR foldable flagship launch.",
    );
    expect(getCuratedDescription("vivo Unveils X300 FE, Launches with Zeiss")).toBe(
      "vivo flagship phone launch.",
    );
  });

  it("returns undefined for titles with no known curated match", () => {
    expect(getCuratedDescription("Some Unrelated Announcement About Nothing In Particular")).toBeUndefined();
  });

  it("is case-insensitive", () => {
    expect(getCuratedDescription("google i/o recap")).toBe("Google's annual developer conference.");
  });
});

describe("getCanonicalTitle", () => {
  const REF = new Date("2026-06-15T00:00:00Z");

  it("rewrites raw newsroom titles into short canonical calendar titles", () => {
    expect(
      getCanonicalTitle(
        "HONOR Launches Magic V6: The Ultimate AI Foldable Flagship Blending Cross-Ecosystem Productivity with Ultra-Slim Durability",
        REF,
      ),
    ).toBe("HONOR Magic V6 Launch");
    expect(
      getCanonicalTitle(
        "HONOR Launches the HONOR 600 Series Setting New Standards for the Accessible Flagship Category",
        REF,
      ),
    ).toBe("HONOR 600 Series Launch");
    expect(getCanonicalTitle("Announcing OpenAI DevDay 2025", new Date("2025-10-06T00:00:00Z"))).toBe(
      "OpenAI DevDay 2025",
    );
    expect(getCanonicalTitle("Android 17 is here", REF)).toBe("Android 17 Stable Release");
    expect(getCanonicalTitle("Android 17 QPR1 Feature Drop is now available", REF)).toBe(
      "Android 17 Feature Drop",
    );
    expect(getCanonicalTitle("Android 17 Beta 2 is now available", REF)).toBe("Android 17 Beta");
    expect(getCanonicalTitle("Apple sets WWDC26 dates", REF)).toBe(`Apple WWDC ${REF.getUTCFullYear()}`);
  });

  it("preserves 'Series' for a Magic-line series launch, distinct from a single-model launch", () => {
    // "China" is a preserved variant qualifier (see the variant-qualifier
    // tests below) — a China-specific series launch must read differently
    // from an unqualified one, not be normalized away.
    expect(getCanonicalTitle("HONOR Launches AI-Flagship HONOR Magic8 Series in China", REF)).toBe(
      "HONOR Magic8 Series China Launch",
    );
    expect(
      getCanonicalTitle(
        "HONOR Launches Magic8 Pro: AI Camera Flagship Redefining Mobile Photography with Next-Gen AI Imaging",
        REF,
      ),
    ).toBe("HONOR Magic8 Pro Launch");
  });

  it("keeps 'FE' as an initialism but title-cases other vivo suffixes", () => {
    expect(
      getCanonicalTitle("vivo Unveils X300 FE: Launches with ZEISS Telephoto Extender Gen 2", REF),
    ).toBe("vivo X300 FE Launch");
    expect(getCanonicalTitle("vivo X300 Ultra Debuts in India", REF)).toBe("vivo X300 Ultra Launch");
  });

  it("returns undefined for a title with no recognized canonical pattern", () => {
    expect(getCanonicalTitle("Some Unrelated Announcement About Nothing In Particular", REF)).toBeUndefined();
  });

  describe("Event Enrichment Part 2: variant/geography qualifiers are never normalized away", () => {
    it("keeps 'OPPO Find X9 China Launch' and 'OPPO Find X9 Global Launch' distinct", () => {
      expect(getCanonicalTitle("OPPO Unveils Find X9 in China", REF)).toBe("OPPO Find X9 China Launch");
      expect(getCanonicalTitle("OPPO Launches Find X9 Global", REF)).toBe("OPPO Find X9 Global Launch");
    });

    it("keeps 'OPPO Find X9 Launch' and 'OPPO Find X9 Ultra Launch' distinct — the exact regression case named in the task", () => {
      // Good: no variant wording present, no suffix added.
      expect(getCanonicalTitle("Launches the AI-powered OPPO Find X9", REF)).toBe("OPPO Find X9 Launch");
      // Bad (old, buggy behavior) would have been "OPPO Find X9 Launch" —
      // dropping "Ultra" entirely. Must stay "OPPO Find X9 Ultra Launch".
      expect(getCanonicalTitle("OPPO Unveils Find X9 Ultra", REF)).toBe("OPPO Find X9 Ultra Launch");
    });

    it("keeps a Fold variant distinct from the unqualified base model", () => {
      expect(getCanonicalTitle("OPPO Launches the Find X9 Fold Edition", REF)).toBe(
        "OPPO Find X9 Fold Launch",
      );
      expect(getCanonicalTitle("OPPO Unveils Find X9", REF)).toBe("OPPO Find X9 Launch");
    });

    it("never reads marketing wording like 'Ultra-Slim' as an Ultra variant (hyphen guard)", () => {
      // Real fixture title: the "Ultra" in "Ultra-Slim Durability" is
      // marketing copy, not a Magic V6 Ultra model — must not leak into
      // the canonical title or the variant-qualifier list.
      const title =
        "HONOR Launches Magic V6: The Ultimate AI Foldable Flagship Blending Cross-Ecosystem Productivity with Ultra-Slim Durability";
      expect(getCanonicalTitle(title, REF)).toBe("HONOR Magic V6 Launch");
      expect(extractVariantQualifiers(title)).toEqual([]);
    });

    it("does not double-count a qualifier already encoded by the base pattern (Magic{n} Pro)", () => {
      expect(getCanonicalTitle("HONOR Launches Magic8 Pro Global", REF)).toBe("HONOR Magic8 Pro Global Launch");
    });

    it("preserves multiple qualifiers together, in the order they appear", () => {
      expect(getCanonicalTitle("OPPO Unveils Find X9 Ultra for the Global Market", REF)).toBe(
        "OPPO Find X9 Ultra Global Launch",
      );
    });
  });
});
