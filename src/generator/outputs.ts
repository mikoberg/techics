import type { TechEvent } from "../models/TechEvent.js";

export interface OutputConfig {
  /** ICS filename stem — written as dist/<name>.ics. */
  name: string;
  displayName: string;
  filter: (event: TechEvent) => boolean;
  enabled: boolean;
  /** API/RSS-facing name — written as dist/api/<apiName>(.json). Defaults to `name` if omitted. */
  apiName: string;
  /** One-line, human-facing explanation shown on the landing page — what this output is and isn't for. */
  description: string;
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
    description: "Every confirmed event, today and beyond. Start here.",
    retentionDaysPast: 0,
  },
  {
    name: "android",
    displayName: "Tech Calendar — Android",
    filter: (e) => e.category === "android",
    enabled: true,
    apiName: "android",
    description: "Android platform releases and feature drops only.",
    retentionDaysPast: 0,
  },
  {
    name: "apple",
    displayName: "Tech Calendar — Apple",
    filter: (e) => e.category === "apple",
    enabled: true,
    apiName: "apple",
    description: "Apple keynotes and hardware events only.",
    retentionDaysPast: 0,
  },
  {
    name: "google",
    displayName: "Tech Calendar — Google",
    filter: (e) => e.category === "google",
    enabled: true,
    apiName: "google",
    description: "Google I/O and Made by Google only.",
    retentionDaysPast: 0,
  },
  {
    name: "ai",
    displayName: "Tech Calendar — AI",
    filter: (e) => e.category === "ai",
    enabled: true,
    apiName: "ai",
    description: "AI industry developer events only.",
    retentionDaysPast: 0,
  },
  {
    name: "major",
    displayName: "Tech Calendar — Major Events",
    filter: (e) => e.importance === "major",
    enabled: true,
    apiName: "major",
    description: "A shorter, high-signal list — flagship launches and keynotes only, nothing minor.",
    retentionDaysPast: 0,
  },
  {
    name: "history",
    displayName: "Tech Calendar — History",
    filter: () => true,
    enabled: true,
    apiName: "history",
    description: "Archive of every past event too. Not recommended as a calendar subscription — download to browse instead.",
    // Unbounded: an archive of every event ever published, past or future.
    retentionDaysPast: Infinity,
  },
];
