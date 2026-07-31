import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeNewsroom } from "../../src/utils/htmlScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HONOR_CONFIG = {
  baseUrl: "https://www.honor.com",
  itemSelector: ".news-container",
  titleSelector: ".news-title",
  linkSelector: "a",
  dateSelector: ".news-time.news-pc",
  descriptionSelector: ".news-description",
};

const VIVO_CONFIG = {
  baseUrl: "https://vivonewsroom.in",
  itemSelector: "div.content:has(a.press-title)",
  titleSelector: "a.press-title h4",
  linkSelector: "a.press-title",
  dateSelector: "a.press-rm-btn",
};

describe("scrapeNewsroom", () => {
  it("extracts articles from the Honor fixture with resolved absolute URLs", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/honor-news.html"), "utf-8");
    const articles = scrapeNewsroom(html, HONOR_CONFIG);

    expect(articles).toHaveLength(5);
    const magicV6 = articles.find((a) => a.title.includes("Magic V6"));
    expect(magicV6).toBeDefined();
    expect(magicV6?.url).toBe("https://www.honor.com/global/news/honor-magic-v6-launch/");
    expect(magicV6?.dateText).toBe("June 4, 2026");
    expect(magicV6?.description).toContain("Magic V6");
  });

  it("extracts articles from the vivo fixture", async () => {
    const html = await readFile(path.resolve(__dirname, "../fixtures/html/vivo-press.html"), "utf-8");
    const articles = scrapeNewsroom(html, VIVO_CONFIG);

    expect(articles).toHaveLength(5);
    const x300fe = articles.find((a) => a.title.includes("X300 FE"));
    expect(x300fe).toBeDefined();
    expect(x300fe?.url).toBe(
      "https://vivonewsroom.in/press-release/vivo-unveils-x300-fe-launches-with-zeiss-telephoto-extender-gen-2-and-snapdragon-8-gen-5/",
    );
    expect(x300fe?.dateText).toBe("July 22, 2026");
  });

  it("is resilient: returns an empty array for garbage/empty/unrelated HTML, never throws", () => {
    expect(scrapeNewsroom("", HONOR_CONFIG)).toEqual([]);
    expect(scrapeNewsroom("<not>even<valid", HONOR_CONFIG)).toEqual([]);
    expect(scrapeNewsroom("<html><body><p>no matches here</p></body></html>", HONOR_CONFIG)).toEqual([]);
  });

  it("skips individual items missing a title, link, or date rather than failing the whole parse", () => {
    const html = `
      <div class="news-container">
        <p class="news-time news-pc">June 1, 2026</p>
        <a href="/global/news/complete/"><h3 class="news-title">Complete Item</h3></a>
      </div>
      <div class="news-container">
        <p class="news-time news-pc">June 2, 2026</p>
        <a href="/global/news/no-title/"><h3 class="news-title"></h3></a>
      </div>
      <div class="news-container">
        <a href="/global/news/no-date/"><h3 class="news-title">No Date Item</h3></a>
      </div>
    `;
    const articles = scrapeNewsroom(html, HONOR_CONFIG);
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toBe("Complete Item");
  });

  it("skips an item whose href cannot be resolved to a valid URL", () => {
    const html = `
      <div class="news-container">
        <p class="news-time news-pc">June 1, 2026</p>
        <a href="http://[invalid"><h3 class="news-title">Bad Href</h3></a>
      </div>
    `;
    expect(scrapeNewsroom(html, HONOR_CONFIG)).toEqual([]);
  });

  it("returns an empty array, never a throw, when a page has been completely restructured (every class renamed)", () => {
    const redesigned = `
      <section class="post-card">
        <h2 class="post-card__heading">HONOR Launches Magic V6</h2>
        <time class="post-card__date">June 4, 2026</time>
        <a class="post-card__link" href="/global/news/honor-magic-v6-launch/">Read more</a>
      </section>
    `;
    expect(scrapeNewsroom(redesigned, HONOR_CONFIG)).toEqual([]);
  });
});
