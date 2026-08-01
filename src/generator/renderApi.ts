import type { TechEvent } from "../models/TechEvent.js";
import { dedupeEvents } from "../utils/dedupe.js";

export interface ApiEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  location?: string;
  url?: string;
  category: TechEvent["category"];
  importance: TechEvent["importance"];
  company?: string;
  sourceType: TechEvent["sourceType"];
  discoveryMethod?: TechEvent["discoveryMethod"];
  allDay: boolean;
}

export interface ApiPayload {
  generatedAt: string;
  count: number;
  events: ApiEvent[];
}

/**
 * Builds the static "REST API" JSON payload for one output config's
 * filter. There is no live server behind this — GitHub Pages only serves
 * static files, so this payload is precomputed at build time and
 * refreshed on the next scheduled/triggered build. Dates are serialized
 * as ISO 8601 strings.
 */
export function buildApiPayload(events: TechEvent[], filter: (event: TechEvent) => boolean): ApiPayload {
  const filtered = dedupeEvents(events.filter(filter));
  const sorted = [...filtered].sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    generatedAt: new Date().toISOString(),
    count: sorted.length,
    events: sorted.map(toApiEvent),
  };
}

function toApiEvent(event: TechEvent): ApiEvent {
  return {
    id: event.id,
    title: event.title,
    ...(event.description !== undefined ? { description: event.description } : {}),
    start: event.start.toISOString(),
    ...(event.end !== undefined ? { end: event.end.toISOString() } : {}),
    ...(event.location !== undefined ? { location: event.location } : {}),
    ...(event.url !== undefined ? { url: event.url } : {}),
    category: event.category,
    importance: event.importance,
    ...(event.company !== undefined ? { company: event.company } : {}),
    sourceType: event.sourceType,
    ...(event.discoveryMethod !== undefined ? { discoveryMethod: event.discoveryMethod } : {}),
    allDay: event.allDay ?? false,
  };
}
