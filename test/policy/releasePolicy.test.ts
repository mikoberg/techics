import { describe, it, expect } from "vitest";
import { RELEASE_POLICY } from "../../src/policy/releasePolicy.js";

describe("RELEASE_POLICY", () => {
  it("includes exactly the categories the project targets", () => {
    expect(RELEASE_POLICY.include).toEqual([
      "flagship smartphones",
      "foldables",
      "major OS releases",
      "major OS betas",
      "feature drops",
      "developer conferences",
      "AI conferences",
      "chip launches",
    ]);
  });

  it("excludes exactly the categories the project keeps out", () => {
    expect(RELEASE_POLICY.exclude).toEqual([
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
    ]);
  });
});
