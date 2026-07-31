import { describe, it, expect } from "vitest";
import { getCuratedDescription } from "../../src/utils/curatedDescriptions.js";

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
