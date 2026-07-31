import type { EventSource } from "../sources/EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { ManualSource } from "../sources/manual.js";
import { GoogleSource } from "../sources/google.js";
import { SamsungSource } from "../sources/samsung.js";
import { AppleSource } from "../sources/apple.js";
import { MicrosoftSource } from "../sources/microsoft.js";
import { OpenAiSource } from "../sources/openai.js";
import { NothingSource } from "../sources/nothing.js";
import { OnePlusSource } from "../sources/oneplus.js";
import { OppoSource } from "../sources/oppo.js";
import { XiaomiSource } from "../sources/xiaomi.js";
import { HonorSource } from "../sources/honor.js";
import { VivoSource } from "../sources/vivo.js";
import { RealmeSource } from "../sources/realme.js";
import { SonySource } from "../sources/sony.js";
import { logFetchStart, logFetchResult } from "../utils/logger.js";

/**
 * All registered event sources. manual.ts is listed first so that when
 * results are flattened and later deduplicated, manual (authoritative)
 * entries are encountered before other-source entries and win on conflict.
 * Adding a new vendor is a single line here plus its own file under
 * src/sources implementing EventSource.
 */
export const allSources: EventSource[] = [
  new ManualSource(),
  new GoogleSource(),
  new SamsungSource(),
  new AppleSource(),
  new MicrosoftSource(),
  new OpenAiSource(),
  new NothingSource(),
  new OnePlusSource(),
  new OppoSource(),
  new XiaomiSource(),
  new HonorSource(),
  new VivoSource(),
  new RealmeSource(),
  new SonySource(),
];

export interface SourceResult {
  name: string;
  events: TechEvent[];
  error?: string;
}

function nameOf(source: EventSource, index: number): string {
  return source.displayName ?? source.constructor.name ?? `source-${index}`;
}

/**
 * Runs every registered source concurrently, logging "Fetching X..." /
 * "Found N events." around each. A single misbehaving source never
 * breaks the pipeline: failures are logged as warnings, not thrown,
 * except that a rejection from ManualSource is re-thrown since that
 * source represents real, authoritative data and a failure there
 * indicates a genuine data bug that should stop the build.
 */
export async function getAllEventsBySource(): Promise<SourceResult[]> {
  const results = await Promise.allSettled(
    allSources.map(async (source, index) => {
      const name = nameOf(source, index);
      logFetchStart(name);
      const events = await source.fetchEvents();
      logFetchResult(events.length);
      return events;
    }),
  );

  return results.map((result, index) => {
    const source = allSources[index]!;
    const name = nameOf(source, index);
    if (result.status === "fulfilled") {
      return { name, events: result.value };
    }
    if (source instanceof ManualSource) {
      throw result.reason;
    }
    console.warn(`[sourceRegistry] ${name} failed: ${String(result.reason)}`);
    return { name, events: [], error: String(result.reason) };
  });
}

/** Same as getAllEventsBySource but flattened into a single TechEvent[]. */
export async function getAllEvents(): Promise<TechEvent[]> {
  const results = await getAllEventsBySource();
  return results.flatMap((r) => r.events);
}
