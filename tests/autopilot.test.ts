import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, defaultState, isDue, nextSlot, planNext } from "../src/lib/autopilot.ts";

test("a post is due on the first run and once a calendar day has passed (daily by default)", () => {
  const morning = new Date(2026, 10, 10, 10, 30); // local time, like the launchd agent
  assert.equal(defaultState.cadenceDays, 1);
  assert.equal(isDue(defaultState, morning), true);
  assert.equal(isDue({ ...defaultState, lastPostAt: new Date(2026, 10, 9, 19, 20).toISOString() }, morning), true, "yesterday evening counts as yesterday");
  assert.equal(isDue({ ...defaultState, lastPostAt: new Date(2026, 10, 10, 8, 0).toISOString() }, morning), false, "already posted today");
  assert.equal(isDue({ ...defaultState, cadenceDays: 3, lastPostAt: new Date(2026, 10, 8, 9, 0).toISOString() }, morning), false);
  assert.equal(isDue({ ...defaultState, cadenceDays: 3, lastPostAt: new Date(2026, 10, 7, 9, 0).toISOString() }, morning), true);
});

test("every post is its own tracked entry: no single-post variants", () => {
  const state = { ...defaultState, rotation: ["A2-chef-at-work"], langs: ["it" as const] };
  const fresh = planNext(state, [{ experiment_id: "EXP-004", variant_id: "A", archetype: "A2-chef-at-work", status: "published" }]);
  assert.deepEqual([fresh.experimentId, fresh.variantId], ["EXP-005", "A"]);
  const measured = planNext(state, [{ experiment_id: "EXP-004", variant_id: "A", archetype: "A2-chef-at-work", status: "measured" }]);
  assert.deepEqual([measured.experimentId, measured.variantId], ["EXP-005", "A"], "a measured post does not spawn a variant B");
});

test("advance rotates archetype and language and records the post time", () => {
  const next = advance({ ...defaultState, langs: ["en", "it"] }, new Date("2026-11-10T09:00:00Z"));
  assert.equal(next.nextIndex, 1);
  assert.equal(next.nextLang, 1);
  assert.equal(advance(defaultState, new Date("2026-11-10T09:00:00Z")).nextLang, 0, "one language: it stays");
  assert.equal(next.lastPostAt, "2026-11-10T09:00:00.000Z");
});

test("the next slot is today's posting hour when far enough away, else tomorrow", () => {
  const morning = new Date(2026, 10, 10, 9, 0, 0);
  assert.equal(nextSlot(defaultState, morning).getDate(), 10);
  const evening = new Date(2026, 10, 10, 17, 0, 0);
  assert.equal(nextSlot(defaultState, evening).getDate(), 11);
});

test("the editorial calendar refuses retired formats, repeats, missing or dominant services and too much selling", async () => {
  const { calendarIssues } = await import("../src/lib/autopilot.ts");
  const std = { services: ["class", "chef"], maxServiceShare: 0.6, maxOfferShare: 0.15, offerArchetypes: ["A5-proof-and-offer"] };
  const archetypes = [
    { id: "A1-process-reveal", service: "class" },
    { id: "A3-menu-list", service: "events", active: false },
    { id: "A4-private-table", service: "chef" },
    { id: "A5-proof-and-offer", service: "chef" },
    { id: "A6-chef-series", service: "class" },
  ];
  const shipped = [{ id: "A7-the-island", service: "chef" }, { id: "A8-the-season", service: "class" }, { id: "A9-the-evening", service: "chef" }, { id: "A10-the-craft", service: "class" }];
  assert.deepEqual(calendarIssues(defaultState.rotation, shipped, std), [], "the shipped rotation meets the standard");
  const bad = calendarIssues(["A3-menu-list", "A1-process-reveal", "A1-process-reveal", "A9-unknown"], archetypes, std).join(" | ");
  assert.match(bad, /slot 1: A3-menu-list is retired/);
  assert.match(bad, /slot 2: A1-process-reveal is followed by itself/);
  assert.match(bad, /slot 4: unknown archetype A9-unknown/);
  assert.match(bad, /no slot for the service "chef"/);
  assert.match(calendarIssues(["A6-chef-series", "A1-process-reveal"], archetypes, std).join(" | "), /"class" takes 100% of the slots/);
  assert.match(calendarIssues(["A5-proof-and-offer", "A1-process-reveal"], archetypes, std).join(" | "), /selling posts take 50%/);
  assert.match(calendarIssues(["A4-private-table", "A1-process-reveal", "A4-private-table"], archetypes, std).join(" | "), /slot 3: A4-private-table is followed by itself/, "the rotation wraps around");
});

test("with weekdays set, a post is due on those days only and once a day", () => {
  const state = { ...defaultState, weekdays: [1, 3, 5, 0] };
  const wednesday = new Date(2026, 10, 11, 10, 30);
  const thursday = new Date(2026, 10, 12, 10, 30);
  assert.equal(isDue({ ...state, lastPostAt: null }, wednesday), true);
  assert.equal(isDue({ ...state, lastPostAt: null }, thursday), false);
  assert.equal(isDue({ ...state, lastPostAt: new Date(2026, 10, 11, 0, 43).toISOString() }, wednesday), false, "already produced today");
  assert.equal(isDue({ ...state, lastPostAt: new Date(2026, 10, 11, 0, 43).toISOString() }, new Date(2026, 10, 13, 10, 30)), true);
});
