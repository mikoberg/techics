import type { TechEvent } from "../models/TechEvent.js";

export interface OutputConfig {
  /** ICS filename stem — written as dist/<name>.ics. */
  name: string;
  displayName: string;
  filter: (event: TechEvent) => boolean;
  enabled: boolean;
  /** API/RSS-facing name — written as dist/api/<apiName>(.json). Defaults to `name` if omitted. */
  apiName: string;
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
  },
  {
    name: "android",
    displayName: "Tech Calendar — Android",
    filter: (e) => e.category === "android",
    enabled: true,
    apiName: "android",
  },
  {
    name: "apple",
    displayName: "Tech Calendar — Apple",
    filter: (e) => e.category === "apple",
    enabled: true,
    apiName: "apple",
  },
  {
    name: "google",
    displayName: "Tech Calendar — Google",
    filter: (e) => e.category === "google",
    enabled: true,
    apiName: "google",
  },
  {
    name: "ai",
    displayName: "Tech Calendar — AI",
    filter: (e) => e.category === "ai",
    enabled: true,
    apiName: "ai",
  },
  {
    name: "major",
    displayName: "Tech Calendar — Major Events",
    filter: (e) => e.importance === "major",
    enabled: true,
    apiName: "major",
  },
];
