import type { EventSource } from "./EventSource.js";
import type { TechEvent } from "../models/TechEvent.js";
import { fetchText } from "../utils/httpCache.js";
import { parseFeed, type FeedItem } from "../utils/feedParser.js";
import { extractConfidentDate } from "../utils/extractDate.js";
import { generateEventId } from "../utils/hash.js";
import { getCuratedDescription } from "../utils/curatedDescriptions.js";
import {
  matchesLaunchTitle,
  DERIVATIVE_COVERAGE_PATTERNS,
  SOFTWARE_SAFETY_EXCLUDE_PATTERNS,
} from "../utils/titleFilter.js";

const ANDROID_BLOG_FEED = "https://android-developers.googleblog.com/atom.xml";

// Android stable/beta/feature-drop rollout posts are retrospective: the
// post itself IS the confirmation, published the day of (or immediately
// after) the release, so we trust the feed's own publish date directly.
const ANDROID_RELEASE_KEYWORDS = [/\bfeature drop\b|\bandroid \d+ (beta|qpr)\b|\bandroid \d+ is/i];

// Deliberately NOT DEFAULT_EXCLUDE_PATTERNS: that list's hardware-marketing
// exclusions (e.g. "now available") would reject legitimate software
// rollout phrasing like "Android 17 QPR1 Feature Drop is now available" —
// see titleFilter.ts's note on software/OS release sources.
const ANDROID_RELEASE_EXCLUDE_PATTERNS = [...DERIVATIVE_COVERAGE_PATTERNS, ...SOFTWARE_SAFETY_EXCLUDE_PATTERNS];

// Google I/O and Made by Google (which includes Pixel hardware launches)
// are forward-announced events. The Android Developers Blog occasionally
// mentions them, but a confirmed date requires explicit text — otherwise
// this stays best-effort and manual.json is the reliable path.
const FORWARD_ANNOUNCED_KEYWORDS = [/\bGoogle I\/O\b|\bMade by Google\b/i];

/**
 * Official source: the Android Developers Blog Atom feed (confirmed live
 * at time of writing) — covers Android stable/beta/feature drop releases
 * reliably since those posts are published on release day. Google I/O and
 * Made by Google (which is also where Pixel hardware is launched — no
 * separate Pixel source exists, it's the same real-world event) are only
 * picked up here on a best-effort basis: no dedicated official feed with
 * structured forward-looking dates was found for either, so add their
 * dates to data/manual.json as soon as Google confirms them.
 */
export class GoogleSource implements EventSource {
  readonly displayName = "Google";

  async fetchEvents(): Promise<TechEvent[]> {
    try {
      const xml = await fetchText(ANDROID_BLOG_FEED);
      const items = parseFeed(xml);

      const events: TechEvent[] = [];
      for (const item of items) {
        if (matchesLaunchTitle(item.title, ANDROID_RELEASE_KEYWORDS, ANDROID_RELEASE_EXCLUDE_PATTERNS)) {
          events.push(buildReleaseEvent(item));
        } else if (matchesLaunchTitle(item.title, FORWARD_ANNOUNCED_KEYWORDS)) {
          const event = buildForwardAnnouncedEvent(item);
          if (event) events.push(event);
        }
      }

      return events;
    } catch (error) {
      console.warn(`[GoogleSource] fetch failed: ${String(error)}`);
      return [];
    }
  }
}

function buildReleaseEvent(item: FeedItem): TechEvent {
  const start = item.publishedAt;
  const description = getCuratedDescription(item.title) ?? item.description;
  return {
    id: generateEventId("android", item.title, start),
    title: item.title,
    ...(description ? { description } : {}),
    start,
    url: item.link,
    category: "android",
    importance: "normal",
    company: "Google",
    sourceType: "official-feed",
  };
}

function buildForwardAnnouncedEvent(item: FeedItem): TechEvent | undefined {
  const start = extractConfidentDate(`${item.title} ${item.description}`, item.publishedAt);
  if (!start) {
    console.info(
      `[GoogleSource] Skipping "${item.title}" — no confident date found. Add to manual.json if confirmed.`,
    );
    return undefined;
  }

  const description = getCuratedDescription(item.title) ?? item.description;

  return {
    id: generateEventId("google", item.title, start),
    title: item.title,
    ...(description ? { description } : {}),
    start,
    url: item.link,
    category: "google",
    importance: "major",
    company: "Google",
    sourceType: "official-feed",
    allDay: true,
  };
}
