import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPERIMENT_COLUMNS, ExperimentRow } from "../src/schemas/experiment.ts";
import { REFERENCE_COLUMNS, ReferenceRow } from "../src/schemas/reference.ts";
import { nextId, readExperiments, readReferences } from "../src/lib/data.ts";

test("the JSON schema files document exactly the columns the Zod schemas accept", () => {
  const exp = JSON.parse(readFileSync("data/experiments.schema.json", "utf8")) as { properties: Record<string, unknown> };
  const ref = JSON.parse(readFileSync("data/references.schema.json", "utf8")) as { properties: Record<string, unknown> };
  assert.deepEqual(Object.keys(exp.properties), EXPERIMENT_COLUMNS);
  assert.deepEqual(Object.keys(ref.properties), REFERENCE_COLUMNS);
});

test("the shipped CSVs validate", () => {
  const e = readExperiments();
  assert.deepEqual(e.issues, []);
  assert.ok(e.records.length >= 3);
  assert.equal(e.records[0].reach, null, "metrics stay empty until measured");
  const r = readReferences();
  assert.deepEqual(r.issues, []);
});

test("empty cells become null and numbers are parsed", () => {
  const row = ExperimentRow.parse({
    experiment_id: "EXP-010", variant_id: "A", post_slug: "x-y", archetype: "A1-process-reveal", platform: "instagram", format: "reel",
    hypothesis: "h", success_metric: "m", status: "published", published_at: "", post_url: "", reach: "1200", plays: "900", avg_watch_time_sec: "8.5",
    completion_rate: "", likes: "", comments: "", saves: "30", shares: "", profile_visits: "", link_clicks: "", inquiries: "", qualified_inquiries: "",
    bookings: "", revenue_eur: "", contribution_margin_eur: "", notes: "",
  });
  assert.equal(row.reach, 1200);
  assert.equal(row.avg_watch_time_sec, 8.5);
  assert.equal(row.completion_rate, null);
  assert.equal(row.published_at, null);
});

test("a reference needs a permission basis and a real URL", () => {
  const base = {
    reference_id: "REF-001", collected_at: "2026-11-06", collection_method: "manual", permission_basis: "public_post_viewed_manually",
    source_platform: "instagram", source_url: "https://www.instagram.com/reel/abc/", creator_handle: "", posted_at: "", format: "reel", duration_sec: "",
    language: "", hook_type: "promise", hook_text: "", narrative_structure: "process", cta: "", creative_pattern: "numbered steps", views: "", likes: "",
    comments: "", shares: "", saves: "", why_it_matters: "", notes: "",
  };
  assert.equal(ReferenceRow.safeParse(base).success, true);
  assert.equal(ReferenceRow.safeParse({ ...base, permission_basis: "scraped" }).success, false);
  assert.equal(ReferenceRow.safeParse({ ...base, source_url: "not a url" }).success, false);
});

test("nextId pads and increments", () => {
  assert.equal(nextId("REF", []), "REF-001");
  assert.equal(nextId("EXP", ["EXP-001", "EXP-003"]), "EXP-004");
});
