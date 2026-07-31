import { describe, it, expect } from "vitest";
import { outputConfigs } from "../../src/generator/outputs.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent>): TechEvent {
  return {
    id: "x",
    title: "x",
    start: new Date("2027-01-01T00:00:00Z"),
    category: "conference",
    importance: "normal",
    sourceType: "manual",
    ...overrides,
  };
}

describe("outputConfigs", () => {
  it("defines exactly the six expected outputs, all enabled", () => {
    const names = outputConfigs.map((c) => c.name).sort();
    expect(names).toEqual(["ai", "android", "apple", "calendar", "google", "major"]);
    expect(outputConfigs.every((c) => c.enabled)).toBe(true);
  });

  it("maps calendar's apiName to 'events', others to themselves", () => {
    const byName = Object.fromEntries(outputConfigs.map((c) => [c.name, c.apiName]));
    expect(byName["calendar"]).toBe("events");
    expect(byName["android"]).toBe("android");
    expect(byName["apple"]).toBe("apple");
    expect(byName["google"]).toBe("google");
    expect(byName["ai"]).toBe("ai");
    expect(byName["major"]).toBe("major");
  });

  it("filters events by category/importance correctly", () => {
    const android = makeEvent({ category: "android" });
    const apple = makeEvent({ category: "apple" });
    const google = makeEvent({ category: "google" });
    const ai = makeEvent({ category: "ai" });
    const majorHardware = makeEvent({ category: "hardware", importance: "major" });
    const normalHardware = makeEvent({ category: "hardware", importance: "normal" });

    const all = [android, apple, google, ai, majorHardware, normalHardware];

    const byName = Object.fromEntries(outputConfigs.map((c) => [c.name, c.filter]));

    expect(all.filter(byName["calendar"]!)).toHaveLength(6);
    expect(all.filter(byName["android"]!)).toEqual([android]);
    expect(all.filter(byName["apple"]!)).toEqual([apple]);
    expect(all.filter(byName["google"]!)).toEqual([google]);
    expect(all.filter(byName["ai"]!)).toEqual([ai]);
    expect(all.filter(byName["major"]!)).toEqual([majorHardware]);
  });
});
