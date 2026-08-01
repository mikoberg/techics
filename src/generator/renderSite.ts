import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OutputConfig } from "./outputs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../site/template.html");

/** The next confirmed event on the default public calendar, for the "next up" callout. */
export interface NextEvent {
  title: string;
  start: string;
  company?: string;
}

export interface RenderSiteOptions {
  siteUrl: string;
  repoUrl: string;
  outputs: OutputConfig[];
  /**
   * Event count actually shipped in each output's files, keyed by
   * `apiName` — the exact number written to that output's .ics/.json, not
   * the raw pre-retention pool. Passing the real per-output counts here
   * (rather than re-deriving them from the full event list) guarantees
   * the landing page can never claim a number the actual files don't back up.
   */
  counts: Record<string, number>;
  /** The earliest event in the default calendar output, if any — drives the "next up" line. */
  nextEvent?: NextEvent | undefined;
}

/**
 * Renders dist/index.html from src/site/template.html, filling in real
 * build data (event counts, last-updated timestamp, per-output download
 * links) so the landing page can never go stale relative to the actual
 * generated files.
 */
export async function renderSite(options: RenderSiteOptions): Promise<string> {
  const template = await readFile(TEMPLATE_PATH, "utf-8");

  const calendarCards = options.outputs
    .map((config) => {
      const httpsUrl = `${options.siteUrl}/${config.name}.ics`;
      const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");
      return [
        `<div class="card">`,
        `<h3>${escapeHtml(config.displayName)}</h3>`,
        `<p class="card-description">${escapeHtml(config.description)}</p>`,
        `<div class="links">`,
        `<a class="pill" href="${httpsUrl}">https</a>`,
        `<a class="pill secondary" href="${webcalUrl}">webcal</a>`,
        `</div>`,
        `</div>`,
      ].join("\n");
    })
    .join("\n");

  const apiRows = options.outputs
    .map((config) => {
      const count = options.counts[config.apiName] ?? 0;
      const countLabel =
        count === 0
          ? "no confirmed events yet"
          : `${count} ${count === 1 ? "event" : "events"}`;
      return [
        `<tr>`,
        `<td><code>/api/${config.apiName}</code></td>`,
        `<td>${escapeHtml(config.displayName)} — ${countLabel}<br><span class="row-description">${escapeHtml(config.description)}</span></td>`,
        `</tr>`,
      ].join("\n");
    })
    .join("\n");

  const calendarCount = options.counts["events"] ?? 0;
  const eventCountLabel = calendarCount === 1 ? "upcoming event" : "upcoming events";

  const nextEventLine = options.nextEvent
    ? `Next up: <strong>${escapeHtml(options.nextEvent.title)}</strong> — ${formatDate(options.nextEvent.start)}`
    : "No confirmed upcoming events right now — check back soon.";

  const replacements: Record<string, string> = {
    EVENT_COUNT: String(calendarCount),
    EVENT_COUNT_LABEL: eventCountLabel,
    NEXT_EVENT_LINE: nextEventLine,
    LAST_UPDATED: new Date().toISOString().slice(0, 10),
    CALENDAR_CARDS: calendarCards,
    API_ROWS: apiRows,
    SITE_URL: options.siteUrl,
    REPO_URL: options.repoUrl,
  };

  return template.replace(/{{(\w+)}}/g, (match, key: string) => {
    const value = replacements[key];
    if (value === undefined) {
      throw new Error(`renderSite: no replacement provided for template placeholder {{${key}}}`);
    }
    return value;
  });
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
