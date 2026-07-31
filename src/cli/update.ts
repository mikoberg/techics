import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAllEventsBySource } from "../providers/sourceRegistry.js";

async function main(): Promise<void> {
  const results = await getAllEventsBySource();

  const cacheDir = path.resolve(process.cwd(), "cache");
  await mkdir(cacheDir, { recursive: true });

  const allEvents = results.flatMap((r) => r.events);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const cacheFile = path.join(cacheDir, `raw-events-${dateStamp}.json`);
  await writeFile(cacheFile, JSON.stringify(allEvents, null, 2), "utf-8");

  console.log("Source refresh summary:");
  for (const result of results) {
    const suffix = result.error ? ` (warning: ${result.error})` : "";
    console.log(`  ${result.name}: ${result.events.length}${suffix}`);
  }
  console.log(`Cached ${allEvents.length} total events -> ${cacheFile}`);
}

main().catch((error: unknown) => {
  console.error("update failed:", error);
  process.exitCode = 1;
});
