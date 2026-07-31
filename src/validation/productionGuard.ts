import type { TechEvent } from "../models/TechEvent.js";

/**
 * Thrown when a placeholder/demo/dummy marker is found in an event that's
 * about to be published. Unlike validateEvents.ts's per-event rejection
 * (which drops one bad event and keeps the build going), this is a hard
 * build failure: a placeholder reaching the published pool signals
 * contaminated input (leftover test data, a bad merge, a source bug),
 * not an isolated bad event — the correct response is to stop and
 * surface it, not quietly filter it out.
 */
export class ProductionDataError extends Error {
  constructor(
    public readonly event: TechEvent,
    public readonly field: string,
    public readonly marker: string,
  ) {
    super(
      `Production data policy violation: event "${event.title}" (id: ${event.id}) has ` +
        `field "${field}" containing forbidden marker "${marker}". ` +
        `Placeholder, example, or unconfirmed content must never be published. ` +
        `Fix or remove this event before building.`,
    );
    this.name = "ProductionDataError";
  }
}

// Case-insensitive text markers that indicate placeholder/demo/unfinished content.
const TEXT_MARKERS = ["EXAMPLE", "PLACEHOLDER", "TODO", "TBD", "COMING SOON"];

// Obviously-fake URL hosts/fragments used in examples and test fixtures.
const DUMMY_URL_MARKERS = ["example.com", "example.org", "example.net", "localhost", "127.0.0.1", "yourdomain"];

// Placeholder-style location values.
const FAKE_LOCATION_MARKERS = ["TBD", "N/A", "UNKNOWN", "SOMEWHERE"];

/**
 * Scans every event about to be published for placeholder/demo/dummy
 * content. Throws ProductionDataError on the first match found, naming
 * the exact event and field responsible. Called once, on the final
 * published list, right before any output file is written.
 */
export function assertProductionSafe(events: TechEvent[]): void {
  for (const event of events) {
    checkTextField(event, "title", event.title);
    if (event.description !== undefined) checkTextField(event, "description", event.description);
    if (event.location !== undefined) checkTextField(event, "location", event.location);

    if (event.url !== undefined) {
      checkTextField(event, "url", event.url);
      const lowerUrl = event.url.toLowerCase();
      for (const marker of DUMMY_URL_MARKERS) {
        if (lowerUrl.includes(marker)) {
          throw new ProductionDataError(event, "url", marker);
        }
      }
    }

    if (event.location !== undefined) {
      const upperLocation = event.location.trim().toUpperCase();
      for (const marker of FAKE_LOCATION_MARKERS) {
        if (upperLocation === marker) {
          throw new ProductionDataError(event, "location", marker);
        }
      }
    }
  }
}

function checkTextField(event: TechEvent, field: string, value: string): void {
  const upperValue = value.toUpperCase();
  for (const marker of TEXT_MARKERS) {
    if (upperValue.includes(marker)) {
      throw new ProductionDataError(event, field, marker);
    }
  }
}
