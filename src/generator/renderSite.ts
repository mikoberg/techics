import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TechEvent } from "../models/TechEvent.js";
import type { OutputConfig } from "./outputs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../site/template.html");

export interface RenderSiteOptions {
  siteUrl: string;
  repoUrl: string;
  outputs: OutputConfig[];
  events: TechEvent[];
  categoryCount: number;
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
      const count = options.events.filter(config.filter).length;
      return `<tr><td><code>/api/${config.apiName}</code></td><td>${escapeHtml(config.displayName)} — ${count} events</td></tr>`;
    })
    .join("\n");

  const replacements: Record<string, string> = {
    EVENT_COUNT: String(options.events.length),
    SOURCE_COUNT: String(options.categoryCount),
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
