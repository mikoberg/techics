import { describe, it, expect } from "vitest";
import { generateEventId } from "../src/utils/hash.js";

describe("generateEventId", () => {
  it("produces the same ID for the same category/title/date", () => {
    const a = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T17:00:00Z"));
    const b = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T17:00:00Z"));
    expect(a).toBe(b);
  });

  it("is stable across time-of-day differences on the same calendar day", () => {
    const a = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T00:00:00Z"));
    const b = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T23:59:00Z"));
    expect(a).toBe(b);
  });

  it("is case/whitespace insensitive on title", () => {
    const a = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T17:00:00Z"));
    const b = generateEventId("google", "  google i/o 2027  ", new Date("2027-05-18T17:00:00Z"));
    expect(a).toBe(b);
  });

  it("produces different IDs for different titles", () => {
    const a = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T17:00:00Z"));
    const b = generateEventId("google", "Google I/O 2028", new Date("2027-05-18T17:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("produces different IDs for different dates", () => {
    const a = generateEventId("google", "Google I/O 2027", new Date("2027-05-18T17:00:00Z"));
    const b = generateEventId("google", "Google I/O 2027", new Date("2027-05-19T17:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("produces different IDs for different categories", () => {
    const a = generateEventId("google", "Launch", new Date("2027-05-18T17:00:00Z"));
    const b = generateEventId("hardware", "Launch", new Date("2027-05-18T17:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("prefixes the ID with the category", () => {
    const id = generateEventId("android", "Android 16 Stable", new Date("2027-05-18T17:00:00Z"));
    expect(id.startsWith("android-")).toBe(true);
  });
});
