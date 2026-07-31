import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { TechEvent } from "../models/TechEvent.js";

interface SequenceRecord {
  contentHash: string;
  sequence: number;
}

type SequenceState = Record<string, SequenceRecord>;

/**
 * RFC5545 SEQUENCE tracking: deterministic and persisted, never random.
 *
 * A pure content-hash could be called "deterministic" but would NOT be
 * monotonic — hashes don't increase in a meaningful order, so a client
 * comparing SEQUENCE numbers across updates could see it jump around
 * unpredictably, which defeats the spec's purpose (telling a client
 * "this is newer than what you last saw"). The only correct way to get a
 * real, non-decreasing SEQUENCE is to compare each build against the
 * previous one's recorded state.
 *
 * This project already commits dist/ to git on every build, so that
 * state can persist across CI runs: dist/sequence-state.json maps each
 * event's stable id to the content hash it had last time and the
 * SEQUENCE that was assigned. On each build: a new id starts at 0; an
 * id whose content is unchanged keeps its previous SEQUENCE; an id whose
 * content changed gets previous + 1.
 */
export async function loadSequenceState(filePath: string): Promise<SequenceState> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as SequenceState;
  } catch {
    return {};
  }
}

export async function saveSequenceState(filePath: string, state: SequenceState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}

function computeContentHash(event: TechEvent): string {
  const key = [
    event.title,
    event.description ?? "",
    event.url ?? "",
    event.location ?? "",
    event.start.toISOString(),
    event.end?.toISOString() ?? "",
    event.importance,
    event.company ?? "",
  ].join("|");
  return createHash("sha1").update(key).digest("hex");
}

/**
 * Assigns a `sequence` to every event based on the previous build's
 * recorded state, and returns the updated state to persist. Does not
 * mutate the input events; returns new event objects with `sequence` set.
 */
export function applySequences(
  events: TechEvent[],
  previousState: SequenceState,
): { events: TechEvent[]; state: SequenceState } {
  const nextState: SequenceState = {};

  const updatedEvents = events.map((event) => {
    const contentHash = computeContentHash(event);
    const previous = previousState[event.id];

    let sequence: number;
    if (!previous) {
      sequence = 0;
    } else if (previous.contentHash === contentHash) {
      sequence = previous.sequence;
    } else {
      sequence = previous.sequence + 1;
    }

    nextState[event.id] = { contentHash, sequence };
    return { ...event, sequence };
  });

  return { events: updatedEvents, state: nextState };
}
