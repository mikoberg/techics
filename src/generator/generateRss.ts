import { XMLBuilder } from "fast-xml-parser";
import type { TechEvent } from "../models/TechEvent.js";
import { dedupeEvents } from "../utils/dedupe.js";

export interface GenerateRssOptions {
  siteUrl: string;
  title?: string;
  description?: string;
}

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
});

/**
 * Builds a single RSS 2.0 feed covering the full (unfiltered) event set,
 * for feed readers. Uses fast-xml-parser's XMLBuilder (already a
 * dependency for feed parsing) rather than hand-concatenated strings, so
 * titles/descriptions containing "&", "<", etc. are escaped correctly.
 *
 * `pubDate` on each item is the event's own start date — for a feed of
 * upcoming tech events, that reads more usefully in a feed reader than
 * the (nonexistent) "date this feed item was authored".
 */
export function generateRss(events: TechEvent[], options: GenerateRssOptions): string {
  const title = options.title ?? "Tech Calendar";
  const description = options.description ?? "Major, confirmed tech industry events.";

  const deduped = dedupeEvents(events);
  const sorted = [...deduped].sort((a, b) => a.start.getTime() - b.start.getTime());

  const doc = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    rss: {
      "@_version": "2.0",
      channel: {
        title,
        link: options.siteUrl,
        description,
        lastBuildDate: new Date().toUTCString(),
        item: sorted.map((event) => ({
          title: event.title,
          link: event.url ?? options.siteUrl,
          description: event.description ?? event.title,
          pubDate: event.start.toUTCString(),
          guid: event.id,
        })),
      },
    },
  };

  return builder.build(doc) as string;
}
