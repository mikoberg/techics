/**
 * Short, human-quality descriptions for the recurring event franchises
 * this project already targets. Tried first by every RSS/scrape source
 * before falling back to cleaned article text — a one-line curated
 * description ("Google's annual developer conference.") is far more
 * useful in a calendar/RSS/API than a truncated press-release excerpt.
 * Returns undefined for anything not recognized, so callers can fall back
 * gracefully rather than needing this list to be exhaustive.
 */
const CURATED_DESCRIPTIONS: Array<[RegExp, string]> = [
  [/\bgoogle i\/o\b/i, "Google's annual developer conference."],
  [/\bmade by google\b/i, "Google's annual hardware launch event for Pixel devices."],
  [/\bwwdc\d*\b/i, "Apple's annual Worldwide Developers Conference."],
  [/special event|keynote/i, "Apple hardware announcement event."],
  [/\bgalaxy unpacked\b/i, "Samsung's flagship Galaxy device launch event."],
  [/\bmicrosoft build\b/i, "Microsoft's annual developer conference."],
  [/\bdevday\b/i, "OpenAI's annual developer event."],
  [/\bfeature drop\b/i, "Quarterly Android feature and security update."],
  [/\bandroid \d+ beta\b/i, "Public beta release of the next Android version."],
  [/\bandroid \d+ (?:is|qpr)/i, "Stable Android platform release."],
  [/\bmagic\s?v\d/i, "HONOR foldable flagship launch."],
  [/\bmagic\s?\d/i, "HONOR flagship phone launch."],
  [/\bx\d{3}\b.*\b(?:unveils|debuts)\b|\b(?:unveils|debuts)\b.*\bx\d{3}\b/i, "vivo flagship phone launch."],
];

export function getCuratedDescription(title: string): string | undefined {
  for (const [pattern, description] of CURATED_DESCRIPTIONS) {
    if (pattern.test(title)) return description;
  }
  return undefined;
}
