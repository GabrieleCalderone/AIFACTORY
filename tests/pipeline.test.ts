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

test("the photo cooldown shrinks with a small archive and never drops below one post", async () => {
  const { cooldownPosts } = await import("../src/lib/pipeline.ts");
  assert.equal(cooldownPosts(200, 6), 8, "a large archive keeps the full rest");
  assert.equal(cooldownPosts(46, 6), 6);
  assert.equal(cooldownPosts(20, 6), 2);
  assert.equal(cooldownPosts(5, 6), 1);
});

test("a picture rests until both the days and the pieces have passed; drafts use up nothing", async () => {
  const { restingSlugs } = await import("../src/lib/pipeline.ts");
  const rec = (slug: string, state: string, day: number) => ({ slug, state, updatedAt: new Date(Date.UTC(2026, 10, day, 18)).toISOString(), history: [] });
  const pipeline = Object.fromEntries([rec("a", "PUBLISHED", 1), rec("b", "PUBLISHED", 5), rec("c", "SCHEDULED", 9), rec("d", "PUBLISHED", 12), rec("draft", "RENDERED", 12), rec("no", "REJECTED", 12)].map((r) => [r.slug, r])) as never;
  const now = new Date(Date.UTC(2026, 10, 13, 12));
  assert.deepEqual(restingSlugs(pipeline, { days: 10, pieces: 3 }, now), ["d", "c", "b"], "a is older than ten days and three pieces came after it");
  assert.deepEqual(restingSlugs(pipeline, { days: 28, pieces: 12 }, now), ["d", "c", "b", "a"]);
  assert.deepEqual(restingSlugs(pipeline, { days: 2, pieces: 1 }, now), ["d"]);
});
