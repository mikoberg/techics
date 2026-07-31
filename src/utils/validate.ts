/**
 * Lightweight structural validation of generated ICS text. This is not a
 * full RFC5545 parser — ical-generator's own output is trusted to be
 * syntactically correct. This check instead guards against our own code
 * omitting a required field or property when mapping TechEvent -> VEVENT.
 * Throws with a descriptive message on failure.
 */
export function validateIcs(ics: string): void {
  const requireCalendarLevel = ["BEGIN:VCALENDAR", "END:VCALENDAR", "VERSION:2.0", "PRODID:"];
  for (const marker of requireCalendarLevel) {
    if (!ics.includes(marker)) {
      throw new Error(`Invalid ICS: missing required calendar property "${marker}"`);
    }
  }

  const beginCount = countOccurrences(ics, "BEGIN:VEVENT");
  const endCount = countOccurrences(ics, "END:VEVENT");
  if (beginCount !== endCount) {
    throw new Error(
      `Invalid ICS: mismatched VEVENT blocks (BEGIN:VEVENT=${beginCount}, END:VEVENT=${endCount})`,
    );
  }

  const eventBlocks = extractEventBlocks(ics);
  const requiredEventProps = [
    "UID",
    "DTSTAMP",
    "DTSTART",
    "SUMMARY",
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
  ];
  for (const [index, block] of eventBlocks.entries()) {
    for (const prop of requiredEventProps) {
      if (!block.includes(prop)) {
        throw new Error(`Invalid ICS: VEVENT #${index + 1} is missing required property "${prop}"`);
      }
    }
  }
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function extractEventBlocks(ics: string): string[] {
  const blocks: string[] = [];
  const lines = ics.split(/\r?\n/);
  let current: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = [];
    } else if (line.startsWith("END:VEVENT")) {
      if (current) {
        blocks.push(current.join("\n"));
      }
      current = null;
    } else if (current) {
      current.push(line);
    }
  }
  return blocks;
}
