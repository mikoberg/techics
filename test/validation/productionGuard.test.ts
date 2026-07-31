import { describe, it, expect } from "vitest";
import { assertProductionSafe, ProductionDataError } from "../../src/validation/productionGuard.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "google-abc123",
    title: "Google I/O 2027",
    description: "Google's annual developer conference.",
    start: new Date("2027-05-18T17:00:00Z"),
    url: "https://io.google/",
    location: "Mountain View, CA",
    category: "google",
    importance: "major",
    sourceType: "official-feed",
    ...overrides,
  };
}

describe("assertProductionSafe", () => {
  it("does not throw for a fully clean event pool", () => {
    expect(() => assertProductionSafe([makeEvent()])).not.toThrow();
  });

  it("throws with a clear message naming the event when the title contains a placeholder marker", () => {
    const event = makeEvent({ title: "EXAMPLE Google I/O 2027" });
    try {
      assertProductionSafe([event]);
      expect.fail("expected assertProductionSafe to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProductionDataError);
      const err = error as ProductionDataError;
      expect(err.event).toBe(event);
      expect(err.field).toBe("title");
      expect(err.message).toContain("EXAMPLE Google I/O 2027");
      expect(err.message).toContain("title");
    }
  });

  it("throws for PLACEHOLDER, TODO, TBD, and Coming Soon markers in any text field", () => {
    expect(() => assertProductionSafe([makeEvent({ title: "PLACEHOLDER Event" })])).toThrow(
      ProductionDataError,
    );
    expect(() =>
      assertProductionSafe([makeEvent({ description: "TODO: write a real description" })]),
    ).toThrow(ProductionDataError);
    expect(() => assertProductionSafe([makeEvent({ title: "Launch Date TBD" })])).toThrow(
      ProductionDataError,
    );
    expect(() => assertProductionSafe([makeEvent({ description: "Coming Soon to a store near you" })])).toThrow(
      ProductionDataError,
    );
  });

  it("throws for a dummy URL", () => {
    expect(() => assertProductionSafe([makeEvent({ url: "https://example.com/event" })])).toThrow(
      ProductionDataError,
    );
    expect(() => assertProductionSafe([makeEvent({ url: "http://localhost:3000/event" })])).toThrow(
      ProductionDataError,
    );
  });

  it("throws for a fake location", () => {
    expect(() => assertProductionSafe([makeEvent({ location: "TBD" })])).toThrow(ProductionDataError);
    expect(() => assertProductionSafe([makeEvent({ location: "N/A" })])).toThrow(ProductionDataError);
  });

  it("does not throw when optional fields (description, location, url) are simply absent", () => {
    const { description: _d, location: _l, url: _u, ...rest } = makeEvent();
    expect(() => assertProductionSafe([rest as TechEvent])).not.toThrow();
  });

  it("checks every event in the array, not just the first", () => {
    const clean = makeEvent();
    const bad = makeEvent({ id: "apple-def456", title: "PLACEHOLDER Apple Event" });
    expect(() => assertProductionSafe([clean, bad])).toThrow(ProductionDataError);
  });
});
