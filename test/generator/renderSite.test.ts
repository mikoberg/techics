import { describe, it, expect } from "vitest";
import { renderSite } from "../../src/generator/renderSite.js";
import { outputConfigs } from "../../src/generator/outputs.js";
import type { TechEvent } from "../../src/models/TechEvent.js";

const events: TechEvent[] = [
  {
    id: "google-1",
    title: "Google I/O 2027",
    start: new Date("2027-05-18T17:00:00Z"),
    category: "google",
    importance: "major",
    sourceType: "official-feed",
  },
  {
    id: "android-1",
    title: "Android 17 Feature Drop",
    start: new Date("2027-03-01T00:00:00Z"),
    category: "android",
    importance: "normal",
    sourceType: "official-feed",
  },
];

describe("renderSite", () => {
  it("replaces every template placeholder, leaving none unresolved", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      events,
      categoryCount: 7,
    });

    expect(html).not.toMatch(/{{\w+}}/);
  });

  it("reflects real event counts and includes a card per enabled output", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      events,
      categoryCount: 7,
    });

    expect(html).toContain(">2<"); // EVENT_COUNT
    for (const config of outputConfigs) {
      expect(html).toContain(`${config.name}.ics`);
      expect(html).toContain(`/api/${config.apiName}`);
    }
  });

  it("includes the repo URL in the footer", async () => {
    const html = await renderSite({
      siteUrl: "https://example.github.io/tech-calendar",
      repoUrl: "https://github.com/example/tech-calendar",
      outputs: outputConfigs,
      events,
      categoryCount: 7,
    });

    expect(html).toContain("https://github.com/example/tech-calendar");
  });
});
