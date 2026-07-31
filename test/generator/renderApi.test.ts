import { describe, it, expect } from "vitest";
import { buildApiPayload } from "../../src/generator/renderApi.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

const events: TechEvent[] = [
  {
    id: "google-1",
    title: "Google I/O 2027",
    start: new Date("2027-05-18T17:00:00Z"),
    end: new Date("2027-05-18T19:00:00Z"),
    url: "https://io.google/",
    location: "Mountain View, CA",
    category: "google",
    importance: "major",
    sourceType: "official-feed",
  },
  {
    id: "android-1",
    title: "Android 17 Feature Drop",
    start: new Date("2027-03-01T00:00:00Z"),
    category: "android",
    importance: "normal",
    sourceType: "official-feed",
  },
];

describe("buildApiPayload", () => {
  it("serializes dates as ISO strings and includes generatedAt/count", () => {
    const payload = buildApiPayload(events, () => true);
    expect(payload.count).toBe(2);
    expect(payload.events).toHaveLength(2);
    expect(typeof payload.generatedAt).toBe("string");
    expect(new Date(payload.generatedAt).getTime()).not.toBeNaN();

    const io = payload.events.find((e) => e.title === "Google I/O 2027");
    expect(io?.start).toBe("2027-05-18T17:00:00.000Z");
    expect(io?.end).toBe("2027-05-18T19:00:00.000Z");
    expect(io?.location).toBe("Mountain View, CA");
  });

  it("omits optional fields entirely rather than serializing them as null/undefined", () => {
    const payload = buildApiPayload(events, (e) => e.category === "android");
    expect(payload.events).toHaveLength(1);
    const event = payload.events[0]!;
    expect("end" in event).toBe(false);
    expect("location" in event).toBe(false);
    expect("url" in event).toBe(false);
  });

  it("applies the filter before counting", () => {
    const payload = buildApiPayload(events, (e) => e.category === "google");
    expect(payload.count).toBe(1);
    expect(payload.events[0]?.title).toBe("Google I/O 2027");
  });

  it("sorts events chronologically", () => {
    const payload = buildApiPayload(events, () => true);
    expect(payload.events[0]?.title).toBe("Android 17 Feature Drop");
    expect(payload.events[1]?.title).toBe("Google I/O 2027");
  });
});
