import { describe, it, expect } from "vitest";
import { applySequences } from "../../src/generator/sequenceTracker.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: "google-abc123",
    title: "Google I/O 2027",
    description: "Google's annual developer conference.",
    start: new Date("2027-05-18T17:00:00Z"),
    url: "https://io.google/",
    category: "google",
    importance: "major",
    sourceType: "official-feed",
    ...overrides,
  };
}

describe("applySequences", () => {
  it("assigns sequence 0 to an event with no prior recorded state", () => {
    const { events, state } = applySequences([makeEvent()], {});
    expect(events[0]?.sequence).toBe(0);
    expect(state["google-abc123"]?.sequence).toBe(0);
  });

  it("keeps the same sequence when content is unchanged from the previous build", () => {
    const first = applySequences([makeEvent()], {});
    const second = applySequences([makeEvent()], first.state);
    expect(second.events[0]?.sequence).toBe(0);
  });

  it("increments the sequence when content changes between builds", () => {
    const first = applySequences([makeEvent({ description: "Original description." })], {});
    const second = applySequences([makeEvent({ description: "Updated description." })], first.state);
    expect(second.events[0]?.sequence).toBe(1);

    const third = applySequences([makeEvent({ description: "Updated again." })], second.state);
    expect(third.events[0]?.sequence).toBe(2);
  });

  it("does not increment when an unrelated event in the same build changes", () => {
    const first = applySequences(
      [makeEvent({ id: "a", title: "A" }), makeEvent({ id: "b", title: "B" })],
      {},
    );
    const second = applySequences(
      [makeEvent({ id: "a", title: "A" }), makeEvent({ id: "b", title: "B", description: "Changed." })],
      first.state,
    );
    expect(second.events.find((e) => e.id === "a")?.sequence).toBe(0);
    expect(second.events.find((e) => e.id === "b")?.sequence).toBe(1);
  });

  it("is fully deterministic: never produces a random value across repeated runs with identical input", () => {
    const state = applySequences([makeEvent({ description: "v1" })], {}).state;
    const runs = Array.from({ length: 5 }, () => applySequences([makeEvent({ description: "v2" })], state));
    const sequences = runs.map((r) => r.events[0]?.sequence);
    expect(new Set(sequences).size).toBe(1);
    expect(sequences[0]).toBe(1);
  });

  it("does not mutate the input events", () => {
    const original = makeEvent();
    applySequences([original], {});
    expect(original.sequence).toBeUndefined();
  });
});
