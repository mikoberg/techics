import { describe, it, expect } from "vitest";
import { renderSite } from "../../src/generator/renderSite.js";
import { outputConfigs } from "../../src/generator/outputs.js";

const counts: Record<string, number> = {
  events: 2,
  android: 1,
  apple: 0,
  google: 1,
  ai: 0,
  major: 1,
  history: 24,
};

describe("renderSite", () => {
  it("replaces every template placeholder, leaving none unresolved", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: { title: "Google I/O 2027", start: "2027-05-18T17:00:00Z", company: "Google" },
    });

    expect(html).not.toMatch(/{{\w+}}/);
  });

  it("reflects the real per-output counts passed in, and includes a card per enabled output", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: undefined,
    });

    expect(html).toContain(">2<"); // EVENT_COUNT, from counts["events"]
    for (const config of outputConfigs) {
      expect(html).toContain(`${config.name}.ics`);
      expect(html).toContain(`/api/${config.apiName}`);
      expect(html).toContain(config.description);
    }
  });

  it("pluralizes the hero 'upcoming event(s)' label correctly for both singular and plural counts", async () => {
    const singular = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts: { ...counts, events: 1 },
      nextEvent: undefined,
    });
    expect(singular).toContain(">1<");
    expect(singular).toContain("upcoming event<");
    expect(singular).not.toContain("upcoming events<");

    const plural = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts: { ...counts, events: 2 },
      nextEvent: undefined,
    });
    expect(plural).toContain("upcoming events<");
  });

  it("shows a 'no confirmed events yet' note for a zero-count output instead of a bare '0 events'", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: undefined,
    });

    expect(html).toContain("no confirmed events yet");
    expect(html).not.toContain("0 events");
  });

  it("shows the 'next up' line when a next event is provided", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: { title: "Samsung Galaxy Unpacked August 2026", start: "2026-08-07T00:00:00Z" },
    });

    expect(html).toContain("Next up:");
    expect(html).toContain("Samsung Galaxy Unpacked August 2026");
    expect(html).toContain("August 7, 2026");
  });

  it("shows an honest empty state when there is no next event at all", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: undefined,
    });

    expect(html).toContain("No confirmed upcoming events right now");
  });

  it("includes the repo URL in the footer", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      counts,
      nextEvent: undefined,
    });

    expect(html).toContain("https://github.com/example/tech-calendar");
  });
});
