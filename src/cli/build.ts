import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { getAllEventsBySource } from "../providers/sourceRegistry.js";
import { generateCalendar } from "../generator/generateCalendar.js";
import { generateRss } from "../generator/generateRss.js";
import { buildApiPayload } from "../generator/renderApi.js";
import { renderSite } from "../generator/renderSite.js";
import { outputConfigs } from "../generator/outputs.js";
import { validateIcs } from "../utils/validate.js";
import { validateEvents } from "../validation/validateEvents.js";
import { assertProductionSafe } from "../validation/productionGuard.js";
import { loadSequenceState, saveSequenceState, applySequences } from "../generator/sequenceTracker.js";
import { VALID_CATEGORIES } from "../models/TechEvent.js";

/**
 * Resolves the public site URL and repo URL used in the landing page,
 * RSS feed, and API examples. Set explicitly via SITE_URL/REPO_URL env
 * vars (the GitHub Actions workflow does this using repository context);
 * falls back to deriving from GITHUB_REPOSITORY, then to a placeholder
 * for local `pnpm build` runs before any of that is configured.
 */
function resolveSiteAndRepoUrl(): { siteUrl: string; repoUrl: string } {
  if (process.env.SITE_URL && process.env.REPO_URL) {
    return { siteUrl: process.env.SITE_URL, repoUrl: process.env.REPO_URL };
  }

  const ghRepo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  if (ghRepo) {
    const [owner, repo] = ghRepo.split("/");
    return {
      siteUrl: process.env.SITE_URL ?? `https://${owner}.github.io/${repo}`,
      repoUrl: process.env.REPO_URL ?? `https://github.com/${ghRepo}`,
    };
  }

  return {
    siteUrl: process.env.SITE_URL ?? "https://example.github.io/tech-calendar",
    repoUrl: process.env.REPO_URL ?? "https://github.com/",
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function padDots(label: string, width: number): string {
  return label + " " + ".".repeat(Math.max(1, width - label.length - 1));
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  const sourceResults = await getAllEventsBySource();
  const allEvents = sourceResults.flatMap((r) => r.events);
  const report = validateEvents(allEvents);

  // Production data policy: a placeholder/demo marker anywhere in the
  // published pool is a hard build failure, not a filtered-out event —
  // it signals contaminated input, and the error names the exact event.
  assertProductionSafe(report.published);

  const distDir = path.resolve(process.cwd(), "dist");
  const apiDir = path.join(distDir, "api");
  await mkdir(distDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });

  const sequenceStatePath = path.join(distDir, "sequence-state.json");
  const previousSequenceState = await loadSequenceState(sequenceStatePath);
  const { events, state: nextSequenceState } = applySequences(report.published, previousSequenceState);

  const { siteUrl: initialSiteUrl, repoUrl } = resolveSiteAndRepoUrl();
  let siteUrl = initialSiteUrl;

  // A configured custom domain (see below) takes precedence over the
  // computed github.io URL for every link/example generated below.
  const rootCname = path.resolve(process.cwd(), "CNAME");
  const hasCustomDomain = await fileExists(rootCname);
  let customDomain: string | undefined;
  if (hasCustomDomain) {
    customDomain = (await readFile(rootCname, "utf-8")).trim();
    siteUrl = `https://${customDomain}`;
  }

  const enabledOutputs = outputConfigs.filter((config) => config.enabled);

  console.log("Build summary:");
  for (const config of enabledOutputs) {
    const ics = generateCalendar(events, {
      filter: config.filter,
      calendarName: config.displayName,
    });
    validateIcs(ics);
    const icsFile = path.join(distDir, `${config.name}.ics`);
    await writeFile(icsFile, ics, "utf-8");

    const apiPayload = buildApiPayload(events, config.filter);
    const apiJson = JSON.stringify(apiPayload, null, 2);
    await writeFile(path.join(apiDir, `${config.apiName}.json`), apiJson, "utf-8");
    // Extensionless twin so the literal "/api/<name>" path also works on GitHub Pages.
    await writeFile(path.join(apiDir, config.apiName), apiJson, "utf-8");

    console.log(`  ${config.name}.ics / /api/${config.apiName}: ${apiPayload.count} events`);
  }

  const rss = generateRss(events, { siteUrl });
  await writeFile(path.join(distDir, "feed.xml"), rss, "utf-8");
  console.log(`  feed.xml: ${events.length} events`);

  // Standard GitHub Pages hygiene: prevents Jekyll from mangling dot-prefixed
  // files/directories (e.g. api/) that Jekyll would otherwise ignore or reprocess.
  await writeFile(path.join(distDir, ".nojekyll"), "", "utf-8");

  // Custom domain support: if a CNAME file exists at the repo root (the user
  // adds one once they have a real domain), copy it into dist/ so GitHub
  // Pages picks it up. Nothing to do if it's absent.
  if (hasCustomDomain && customDomain) {
    await writeFile(path.join(distDir, "CNAME"), customDomain, "utf-8");
    console.log(`  CNAME: ${customDomain}`);
  }

  const siteHtml = await renderSite({
    siteUrl,
    repoUrl,
    outputs: enabledOutputs,
    events,
    categoryCount: VALID_CATEGORIES.length,
  });
  await writeFile(path.join(distDir, "index.html"), siteHtml, "utf-8");
  console.log(`  index.html`);

  await saveSequenceState(sequenceStatePath, nextSequenceState);

  const buildSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const reportText = renderBuildReport(sourceResults, report, buildSeconds);
  console.log(`\n${reportText}`);
  await writeFile(path.join(distDir, "build-report.txt"), reportText, "utf-8");
}

function renderBuildReport(
  sourceResults: Awaited<ReturnType<typeof getAllEventsBySource>>,
  report: ReturnType<typeof validateEvents>,
  buildSeconds: string,
): string {
  const divider = "-".repeat(36);
  const lines: string[] = [divider];

  const width = Math.max(20, ...sourceResults.map((r) => r.name.length + 4));
  for (const result of sourceResults) {
    lines.push(`${padDots(result.name, width)} ${result.events.length} events`);
  }

  lines.push(divider);
  lines.push(`${padDots("Published", width)} ${report.published.length}`);
  lines.push(`${padDots("Rejected", width)} ${report.rejected.length}`);
  lines.push(`${padDots("Duplicates", width)} ${report.duplicates.length}`);
  lines.push(`${padDots("Warnings", width)} ${report.warnings.length}`);
  lines.push(`${padDots("Build time", width)} ${buildSeconds} sec`);
  lines.push(divider);

  if (report.rejected.length > 0) {
    lines.push("", "Rejected events:");
    for (const issue of report.rejected) {
      lines.push(`  - "${issue.event.title}": ${issue.reasons.join(", ")}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const issue of report.warnings) {
      lines.push(`  - "${issue.event.title}": ${issue.reasons.join(", ")}`);
    }
  }

  return lines.join("\n");
}

main().catch((error: unknown) => {
  console.error("build failed:", error);
  process.exitCode = 1;
});
