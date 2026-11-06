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

test("planning starts a new experiment, then tests variant B once A is measured", () => {
  const state = { ...defaultState, rotation: ["A2-chef-at-work"], langs: ["it" as const] };
  const fresh = planNext(state, [{ experiment_id: "EXP-004", variant_id: "A", archetype: "A2-chef-at-work", status: "published" }]);
  assert.deepEqual([fresh.experimentId, fresh.variantId], ["EXP-005", "A"]);
  const measured = planNext(state, [{ experiment_id: "EXP-004", variant_id: "A", archetype: "A2-chef-at-work", status: "measured" }]);
  assert.deepEqual([measured.experimentId, measured.variantId], ["EXP-004", "B"]);
  const both = planNext(state, [
    { experiment_id: "EXP-004", variant_id: "A", archetype: "A2-chef-at-work", status: "measured" },
    { experiment_id: "EXP-004", variant_id: "B", archetype: "A2-chef-at-work", status: "measured" },
  ]);
  assert.deepEqual([both.experimentId, both.variantId], ["EXP-005", "A"]);
});

test("advance rotates archetype and language and records the post time", () => {
  const next = advance(defaultState, new Date("2026-11-10T09:00:00Z"));
  assert.equal(next.nextIndex, 1);
  assert.equal(next.nextLang, 1);
  assert.equal(next.lastPostAt, "2026-11-10T09:00:00.000Z");
});

test("the next slot is today's posting hour when far enough away, else tomorrow", () => {
  const morning = new Date(2026, 10, 10, 9, 0, 0);
  assert.equal(nextSlot(defaultState, morning).getDate(), 10);
  const evening = new Date(2026, 10, 10, 17, 0, 0);
  assert.equal(nextSlot(defaultState, evening).getDate(), 11);
});
