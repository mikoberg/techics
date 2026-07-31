import type { TechEvent } from "../models/TechEvent.js";

/**
 * The single contract every event source implements. This is the
 * architecture's extension point: to add a new vendor, or to replace a
 * stub with a real scraper/API client, implement this interface in its
 * own file under src/sources and register it in src/providers/sourceRegistry.ts.
 * Nothing else in the pipeline needs to change.
 */
export interface EventSource {
  /** Human-readable name used in "Fetching X..." log output. Falls back to the class name if omitted. */
  readonly displayName?: string;
  fetchEvents(): Promise<TechEvent[]>;
}
