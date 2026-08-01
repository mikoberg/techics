import ical, { ICalEventStatus, ICalEventTransparency, ICalCalendarMethod } from "ical-generator";
import type { TechEvent } from "../models/TechEvent.js";
import { dedupeEvents } from "../utils/dedupe.js";

export interface GenerateCalendarOptions {
  filter?: (event: TechEvent) => boolean;
  calendarName?: string;
}

const OFFICIAL_EVENT_LABEL = "Official event:";

/**
 * Whether there's a watch link worth putting in the description at all.
 * Always true whenever watchUrl is set — even when it's identical to
 * `url` — because the ICS `URL` property is not a reliable place for a
 * user to actually find the link: Google Calendar, confirmed live,
 * simply never surfaces the VEVENT URL property in its UI for
 * imported/subscribed calendars. The description is the only place a
 * meaningful fraction of real users will ever see this link, so it's
 * included there unconditionally rather than only when it differs from
 * `url` (verified against a real Google Calendar subscription that showed
 * no link at all for a Samsung event where watchUrl === url).
 */
function hasWatchUrl(event: TechEvent): boolean {
  return event.watchUrl !== undefined;
}

/**
 * Builds the plain-text DESCRIPTION: the source description, plus an
 * appended "Official event:" block pointing at watchUrl whenever one exists.
 */
function buildPlainDescription(event: TechEvent): string | undefined {
  const parts: string[] = [];
  if (event.description !== undefined) parts.push(event.description);
  if (hasWatchUrl(event)) parts.push(`${OFFICIAL_EVENT_LABEL}\n${event.watchUrl}`);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds the X-ALT-DESC (RFC-conventional HTML alternate description)
 * body — an HTML-formatted mirror of buildPlainDescription, with the
 * watch link rendered as a clickable anchor. Returns undefined whenever
 * there's no description at all, since an HTML wrapper around nothing
 * isn't worth emitting. Calendar apps that don't understand X-ALT-DESC
 * simply ignore it and fall back to plain DESCRIPTION, per RFC — that's
 * the "when supported" in "Generate X-ALT-DESC (when supported)".
 */
function buildHtmlDescription(event: TechEvent): string | undefined {
  if (event.description === undefined && !hasWatchUrl(event)) return undefined;

  const parts: string[] = [];
  if (event.description !== undefined) parts.push(`<p>${escapeHtml(event.description)}</p>`);
  if (hasWatchUrl(event)) {
    const href = escapeHtml(event.watchUrl!);
    parts.push(`<p><b>${OFFICIAL_EVENT_LABEL}</b> <a href="${href}">${href}</a></p>`);
  }
  return `<html><body>${parts.join("")}</body></html>`;
}

/**
 * Core reusable pipeline: filter -> dedupe -> sort -> build ICS string.
 * Called once per output (see generator/outputs.ts) with a different
 * filter/name each time, so adding a new filtered calendar never requires
 * touching this function.
 */
export function generateCalendar(events: TechEvent[], options: GenerateCalendarOptions = {}): string {
  const filter = options.filter ?? (() => true);
  const calendarName = options.calendarName ?? "Tech Calendar";

  const filtered = events.filter(filter);
  const deduped = dedupeEvents(filtered);
  const sorted = [...deduped].sort((a, b) => a.start.getTime() - b.start.getTime());

  const calendar = ical({
    name: calendarName,
    prodId: "//TechCalendar//EN",
    // Deliberately the literal string "UTC": ical-generator special-cases
    // it to mean "no named VTIMEZONE, always render absolute Z-suffixed
    // UTC times" — the only representation that's correct regardless of
    // the machine's local timezone. Passing any other zone name (even a
    // UTC-equivalent one like "Etc/UTC") switches ical-generator onto a
    // named-timezone rendering path that reinterprets each event's stored
    // instant using the *host machine's* local offset — verified live to
    // shift displayed times by hours. That would be a strictly worse bug
    // than the missing X-WR-TIMEZONE header it was meant to add, so it's
    // intentionally not used here.
    timezone: "UTC",
    method: ICalCalendarMethod.PUBLISH,
    scale: "GREGORIAN",
    // REFRESH-INTERVAL;VALUE=DURATION (RFC 7986) and X-PUBLISHED-TTL (a
    // long-established de facto convention) both tell a subscribing
    // client how often to re-poll. ical-generator's `ttl` option (in
    // seconds) emits both, verified directly. 24h matches this project's
    // actual daily build cadence — not a guessed number.
    ttl: 60 * 60 * 24,
  });

  for (const event of sorted) {
    const plainDescription = buildPlainDescription(event);
    const htmlDescription = buildHtmlDescription(event);

    const icalEvent = calendar.createEvent({
      id: event.id,
      // Deterministic, content-hash-compared-to-previous-build sequence
      // (see generator/sequenceTracker.ts) — never random, never static.
      sequence: event.sequence ?? 0,
      start: event.start,
      ...(event.end !== undefined ? { end: event.end } : {}),
      // Events whose real time-of-day isn't known (allDay) are emitted as
      // RFC5545 all-day (VALUE=DATE) events rather than a fabricated
      // midnight timestamp, which would render as the wrong calendar day
      // in timezones west of UTC.
      allDay: event.allDay ?? false,
      summary: event.title,
      ...(plainDescription !== undefined ? { description: plainDescription } : {}),
      ...(event.url !== undefined ? { url: event.url } : {}),
      ...(event.location !== undefined ? { location: event.location } : {}),
      status: ICalEventStatus.CONFIRMED,
      transparency: ICalEventTransparency.TRANSPARENT,
    });

    if (htmlDescription !== undefined) {
      icalEvent.x("X-ALT-DESC;FMTTYPE=text/html", htmlDescription);
    }
  }

  return calendar.toString();
}
