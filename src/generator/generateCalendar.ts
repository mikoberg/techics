import ical, { ICalEventStatus, ICalEventTransparency, ICalCalendarMethod } from "ical-generator";
import type { TechEvent } from "../models/TechEvent.js";
import { dedupeEvents } from "../utils/dedupe.js";

export interface GenerateCalendarOptions {
  filter?: (event: TechEvent) => boolean;
  calendarName?: string;
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
  });

  for (const event of sorted) {
    calendar.createEvent({
      id: event.id,
      start: event.start,
      ...(event.end !== undefined ? { end: event.end } : {}),
      // Events whose real time-of-day isn't known (allDay) are emitted as
      // RFC5545 all-day (VALUE=DATE) events rather than a fabricated
      // midnight timestamp, which would render as the wrong calendar day
      // in timezones west of UTC.
      allDay: event.allDay ?? false,
      summary: event.title,
      ...(event.description !== undefined ? { description: event.description } : {}),
      ...(event.url !== undefined ? { url: event.url } : {}),
      ...(event.location !== undefined ? { location: event.location } : {}),
      status: ICalEventStatus.CONFIRMED,
      transparency: ICalEventTransparency.TRANSPARENT,
    });
  }

  return calendar.toString();
}
