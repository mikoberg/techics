import type { TechEvent } from "../models/TechEvent.js";
import { getAllEvents } from "../providers/sourceRegistry.js";

/**
 * Thin seam between the CLI and the source registry, so cli/build.ts
 * doesn't need to know about individual sources, and tests can mock this
 * one function instead of every source.
 */
export async function buildEvents(): Promise<TechEvent[]> {
  return getAllEvents();
}
