import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertEvidence,
  canTransition,
  summarize,
  transition,
  type Pipeline,
} from "../src/lib/pipeline.ts";

test("the happy path walks every state in order and records history", () => {
  const p: Pipeline = {};
  const now = new Date("2026-11-07T10:30:00Z");
  for (const s of [
    "DISCOVERED",
    "QUALITY_CHECKED",
    "APPROVED",
    "RENDERED",
    "READY",
    "SCHEDULED",
    "PUBLISHED",
    "MEASURED",
  ] as const)
    transition(p, "a6-x", s, undefined, now);
  assert.equal(p["a6-x"].state, "MEASURED");
  assert.equal(p["a6-x"].history.length, 8);
  assert.equal(p["a6-x"].history[0].from, null);
});

test("produced is not published: illegal jumps are refused and evidence is required", () => {
  const p: Pipeline = {};
  transition(p, "s", "DISCOVERED");
  assert.throws(() => transition(p, "s", "PUBLISHED"), /illegal transition/);
  transition(p, "s", "QUALITY_CHECKED");
  transition(p, "s", "APPROVED");
  transition(p, "s", "RENDERED");
  transition(p, "s", "READY");
  const rec = transition(p, "s", "SCHEDULED");
  assert.throws(() => assertEvidence(rec), /without Buffer post ids/);
  rec.evidence = { bufferPostIds: ["p1"] };
  assertEvidence(rec);
  transition(p, "s", "PUBLISHED");
  assertEvidence(rec);
  transition(p, "s", "MEASURED");
  assert.throws(() => assertEvidence(rec), /without metrics/);
});

test("side states can recover and the first state must be DISCOVERED", () => {
  const p: Pipeline = {};
  assert.throws(() => transition(p, "z", "READY"), /first state/);
  transition(p, "z", "DISCOVERED");
  transition(p, "z", "FAILED", "render crashed");
  assert.equal(canTransition("FAILED", "RENDERED"), true);
  transition(p, "z", "QUALITY_CHECKED");
  transition(p, "z", "REJECTED", "chef said no");
  transition(p, "z", "DISCOVERED");
  assert.deepEqual(summarize(p).DISCOVERED, 1);
});

test("only posts that reached the audience, or wait to, count for the photo cooldown; newest first", async () => {
  const { recentLiveSlugs } = await import("../src/lib/pipeline.ts");
  const rec = (slug: string, state: string, updatedAt: string) => ({ slug, state, updatedAt, history: [] });
  const pipeline = {
    old: rec("old", "PUBLISHED", "2026-11-01T10:00:00Z"),
    draft: rec("draft", "RENDERED", "2026-11-09T10:00:00Z"),
    rejected: rec("rejected", "REJECTED", "2026-11-10T10:00:00Z"),
    waiting: rec("waiting", "READY", "2026-11-11T10:00:00Z"),
    queued: rec("queued", "SCHEDULED", "2026-11-12T10:00:00Z"),
  } as never;
  assert.deepEqual(recentLiveSlugs(pipeline, 8), ["queued", "waiting", "old"]);
  assert.deepEqual(recentLiveSlugs(pipeline, 2), ["queued", "waiting"]);
});
