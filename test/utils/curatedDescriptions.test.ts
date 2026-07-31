import { describe, it, expect } from "vitest";
import { getCuratedDescription, getCanonicalTitle } from "../../src/utils/curatedDescriptions.js";

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
    expect(getCanonicalTitle("HONOR Launches AI-Flagship HONOR Magic8 Series in China", REF)).toBe(
      "HONOR Magic8 Series Launch",
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
});
