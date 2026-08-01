import type { TechEvent } from "../models/TechEvent.js";

export interface OutputConfig {
  /** ICS filename stem — written as dist/<name>.ics. */
  name: string;
  displayName: string;
  filter: (event: TechEvent) => boolean;
  enabled: boolean;
  /** API/RSS-facing name — written as dist/api/<apiName>(.json). Defaults to `name` if omitted. */
  apiName: string;
  /**
   * Publication retention window, in days before today, applied by
   * src/generator/retention.ts — NOT a validation rule (see that file's
   * doc comment for why the two are kept separate). `0` means "today or
   * later only," the default for every public-facing calendar. `Infinity`
   * means no past cutoff at all — used by the `history` output, an
   * unbounded archive of every event ever published.
   */
  retentionDaysPast: number;
}

/**
 * Every calendar/API file the build can produce. Only `enabled: true`
 * entries are written by cli/build.ts. Adding a new filtered output is a
 * one-line addition here — no other code changes are needed. This one
 * config drives the ICS file, the JSON API file, and the landing page's
 * list of downloads, so they can never drift out of sync with each other.
 */
export const outputConfigs: OutputConfig[] = [
  {
    name: "calendar",
    displayName: "Tech Calendar",
    filter: () => true,
    enabled: true,
    apiName: "events",
    retentionDaysPast: 0,
  },
  {
    name: "android",
    displayName: "Tech Calendar — Android",
    filter: (e) => e.category === "android",
    enabled: true,
    apiName: "android",
    retentionDaysPast: 0,
  },
  {
    name: "apple",
    displayName: "Tech Calendar — Apple",
    filter: (e) => e.category === "apple",
    enabled: true,
    apiName: "apple",
    retentionDaysPast: 0,
  },
  {
    name: "google",
    displayName: "Tech Calendar — Google",
    filter: (e) => e.category === "google",
    enabled: true,
    apiName: "google",
    retentionDaysPast: 0,
  },
  {
    name: "ai",
    displayName: "Tech Calendar — AI",
    filter: (e) => e.category === "ai",
    enabled: true,
    apiName: "ai",
    retentionDaysPast: 0,
  },
  {
    name: "major",
    displayName: "Tech Calendar — Major Events",
    filter: (e) => e.importance === "major",
    enabled: true,
    apiName: "major",
    retentionDaysPast: 0,
  },
  {
    name: "history",
    displayName: "Tech Calendar — History",
    filter: () => true,
    enabled: true,
    apiName: "history",
    // Unbounded: an archive of every event ever published, past or future.
    retentionDaysPast: Infinity,
  },
];
