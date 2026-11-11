import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { agreement, appendLabel, buildLabel, readLabels, type ReviewLabel } from "../src/lib/labels.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

test("a label keeps the decision, the reason and the post as the person saw it", () => {
  const spec = parsePostSpec(demoSpec);
  const label = buildLabel({ slug: spec.slug, decision: "rejected", note: "  la foto 2 è uno screenshot  ", source: "console", at: new Date("2026-11-11T10:00:00Z"), standard: "2026-11-11", spec });
  assert.equal(label.decision, "rejected");
  assert.equal(label.note, "la foto 2 è uno screenshot");
  assert.equal(label.standard, "2026-11-11");
  assert.equal(label.archetype, spec.brief.archetype);
  assert.equal(label.caption, spec.caption);
  assert.ok(label.texts!.includes(spec.reel!.hook.title));
  assert.ok(label.images!.includes(spec.reel!.hook.image!));
  assert.equal(new Set(label.images).size, label.images!.length, "each picture once");
  const bare = buildLabel({ slug: "gone", decision: "approved", source: "cli", at: new Date("2026-11-11T10:00:00Z"), spec: null });
  assert.deepEqual(bare, { at: "2026-11-11T10:00:00.000Z", slug: "gone", decision: "approved", source: "cli" });
});

test("labels are appended one per line and read back", () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "labels-")), "labels.jsonl");
  assert.deepEqual(readLabels(file), []);
  appendLabel({ at: "a", slug: "one", decision: "approved", source: "console" }, file);
  appendLabel({ at: "b", slug: "two", decision: "rejected", source: "cli", note: "no" }, file);
  assert.deepEqual(readLabels(file).map((l) => l.slug), ["one", "two"]);
});

test("agreement reports how many rejections a reviewer catches and how many approvals it lets through", () => {
  const mk = (slug: string, decision: ReviewLabel["decision"]): ReviewLabel => ({ at: "t", slug, decision, source: "console" });
  const labels = [mk("bad-1", "rejected"), mk("bad-2", "rejected"), mk("good-1", "approved"), mk("good-2", "approved"), mk("good-3", "approved"), mk("odd", "approved")];
  const passes: Record<string, boolean | null> = { "bad-1": false, "bad-2": true, "good-1": true, "good-2": true, "good-3": false, odd: null };
  const got = agreement(labels, (l) => passes[l.slug]);
  assert.equal(got.judged, 5);
  assert.equal(got.unknown, 1);
  assert.equal(got.catches, 0.5);
  assert.equal(Math.round(got.letsThrough! * 100), 67);
  assert.equal(got.enough, false, "five labels are far too few to act on");
  assert.equal(agreement([], () => true).catches, null);
});
