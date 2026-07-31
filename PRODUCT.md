# TechCalendar — Product Manifesto

This document explains what TechCalendar *is*, what it deliberately refuses to be, and how to make decisions about it — without needing to read a single line of source code. If you're deciding whether an event belongs, whether a feature fits, or whether a contribution is in scope, start here.

## Mission

Provide a clean, reliable calendar of major, officially confirmed technology events — subscribable in any standard calendar app, with no rumors, no noise, and no marketing.

That's the whole mission. Everything else in this document is in service of that one sentence.

## Scope

TechCalendar is **a curated calendar**, not a media product. Being precise about the difference is the entire point of this document.

**It is NOT:**
- a news website
- a blog
- a press release archive
- a marketing feed

**It IS:**
A curated calendar of major, officially confirmed technology events.

If a proposed change would make the project behave more like the left column and less like the right one — publishing more often, covering more topics, summarizing more content, chasing more traffic — it is out of scope, regardless of how useful it might sound in isolation.

## Inclusion policy

An event belongs in TechCalendar when it is:
1. **Officially confirmed** — announced by the organization itself, on an official channel, with a real date. Never a rumor, leak, or third-party guess.
2. **Materially significant** — the kind of event a technology enthusiast would actually want a calendar reminder for, not just be mildly interested to read about.
3. **A launch or a milestone** — a new product, a new OS version, a developer conference, a chip generation — not commentary about one.

**Examples of included events:**
- ✓ WWDC
- ✓ Google I/O
- ✓ Snapdragon Summit
- ✓ Galaxy Unpacked
- ✓ Pixel Launch Event
- ✓ Android Stable Release
- ✓ Android Beta
- ✓ Android Feature Drop
- ✓ Microsoft Build
- ✓ OpenAI DevDay

Generalized, the categories this project targets are: flagship smartphones, foldables, major OS releases, major OS betas, feature drops, developer conferences, AI conferences, and chip launches.

## Exclusion policy

Just as important as what's included is what's permanently, deliberately kept out — not because it couldn't technically be scraped or scheduled, but because publishing it would violate the mission.

**Examples of excluded events:**
- ✗ promotions
- ✗ discounts
- ✗ interviews
- ✗ software patches
- ✗ regional launches
- ✗ accessories
- ✗ colour variants
- ✗ security advisories
- ✗ press releases without a launch

A useful test: **would a reasonable person want a calendar reminder for this, specifically, or would they just want to read about it once?** Interviews, patch notes, security advisories, and marketing campaigns fail this test even when they're genuinely newsworthy — they belong in a news feed, not a calendar. TechCalendar is explicitly not a news feed.

**On "regional launches" specifically:** the distinction that matters is *first official launch announcement* vs. *secondary rollout*, not *regional vs. global*. A product's first reveal — even one published by a manufacturer's regionally-scoped official newsroom, when that's the only official source available — is the launch, and belongs in the calendar. A *follow-up* announcement that an already-launched product is now rolling out to another market does not.

## Quality principles

- **One event, one entry.** No duplicates, no near-duplicates, no the-same-launch-covered-three-ways.
- **Short, human-quality descriptions.** "Google's annual developer conference," not a 500-word press release excerpt. If a description reads like it was copy-pasted from an article, it's wrong.
- **Correct dates, correctly represented.** A date-only announcement is a date-only calendar entry (all-day), never a fabricated timestamp. A real scheduled time is a real scheduled time. Never guess a date that isn't stated.
- **Every entry has an official source.** If it can't be traced back to the organization that made the announcement, it doesn't belong.

## Reliability principles

- **Official sources first, always.** An official RSS/Atom feed beats an official web page beats nothing. Nothing beats a rumor — a rumor is never a source.
- **Reliability over completeness.** It is better to under-cover a manufacturer than to publish something wrong. A manufacturer with no reliable official source is left out entirely (and documented as such) rather than covered by scraping something fragile or unofficial.
- **Never fabricate.** No guessed dates, no invented descriptions, no "probably happening around then." If the information isn't confirmed, it isn't published.
- **Fail quietly, never loudly.** A single broken data source degrades to publishing nothing from that source — it never breaks the calendar for every other event, and it never publishes something incorrect as a fallback.
- **When in doubt, leave it out.** Missing an event is a recoverable, minor gap. Publishing an incorrect one erodes the only thing this project sells: trust.

## Contribution philosophy

- **Contributions that improve reliability, accuracy, or the quality of existing coverage are always welcome.** A more precise date extraction, a better description, a fix for a source that broke.
- **Contributions that expand scope need to justify themselves against this document first**, not against "wouldn't it be cool if." A new manufacturer, a new event category, a new output format — all fine, provided they fit the mission above and meet the same reliability bar as everything already here.
- **No feature is worth compromising quality principles or reliability principles for.** If a proposed contribution would require guessing a date, fabricating a description, or including something from the exclusion list "just this once," the answer is no, regardless of how minor it seems.
- **This document outranks convenience.** If shipping something faster means quietly relaxing the inclusion/exclusion policy, ship it slower instead.

---

For how these principles are technically enforced in code (the `ReleasePolicy` type, per-source filters, the validation pipeline), see [README.md](README.md#release-policy). This document is the *why*; the README is the *how*.
