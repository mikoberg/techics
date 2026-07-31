import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { ManualSource } from "../src/sources/manual.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "fixtures/manual.sample.json");

describe("ManualSource", () => {
  it("loads and maps the fixture file correctly", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();

    expect(events).toHaveLength(3);

    const conference = events.find((e) => e.title === "Sample Conference 2027");
    expect(conference).toBeDefined();
    expect(conference?.category).toBe("conference");
    expect(conference?.importance).toBe("major");
    expect(conference?.location).toBe("Testville");
    expect(conference?.start.toISOString()).toBe("2027-03-10T15:00:00.000Z");
    expect(conference?.end?.toISOString()).toBe("2027-03-12T20:00:00.000Z");
  });

  it("tags every event with sourceType 'manual'", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();
    expect(events.every((e) => e.sourceType === "manual")).toBe(true);
  });

  it("treats a date with an explicit time as timed (not allDay)", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();
    const conference = events.find((e) => e.title === "Sample Conference 2027");
    expect(conference?.allDay).toBeUndefined();
  });

  it("treats a bare date (no time component) as allDay, and passes through company", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();
    const bareDate = events.find((e) => e.title === "Sample Bare-Date Event");
    expect(bareDate?.allDay).toBe(true);
    expect(bareDate?.company).toBe("Acme");
  });

  it("defaults importance to 'normal' when absent", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();
    const minor = events.find((e) => e.title === "Sample Minor Event");
    expect(minor?.importance).toBe("normal");
    expect(minor?.end).toBeUndefined();
  });

  it("produces deterministic IDs derived from category+title+date", async () => {
    const source = new ManualSource(FIXTURE_PATH);
    const events = await source.fetchEvents();
    const conference = events.find((e) => e.title === "Sample Conference 2027");
    expect(conference?.id).toMatch(/^conference-[0-9a-f]{16}$/);
  });

  it("throws on a malformed entry (invalid category)", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "techcalendar-test-"));
    const badFile = path.join(tmpDir, "bad-manual.json");
    await writeFile(
      badFile,
      JSON.stringify([{ title: "Bad Event", date: "2027-01-01T00:00:00Z", category: "not-a-real-category" }]),
      "utf-8",
    );

    const source = new ManualSource(badFile);
    await expect(source.fetchEvents()).rejects.toThrow();

    await rm(tmpDir, { recursive: true, force: true });
  });

  it("throws when the JSON root is not an array", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "techcalendar-test-"));
    const badFile = path.join(tmpDir, "not-an-array.json");
    await writeFile(badFile, JSON.stringify({ oops: true }), "utf-8");

    const source = new ManualSource(badFile);
    await expect(source.fetchEvents()).rejects.toThrow();

    await rm(tmpDir, { recursive: true, force: true });
  });
});
