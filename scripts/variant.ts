/**
 * Clone a post spec as a new variant of the same experiment, changing one or more fields,
 * and add its row to data/experiments.csv (status draft).
 *
 *   node scripts/variant.ts content/posts/pasta-class-palermo.json B \
 *     --set reel.hook.title="Make pasta with a chef in Palermo" [--set caption="..."] [--slug custom-slug] [--no-row]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";
import { applySet } from "../src/lib/variant.ts";
import { parsePostSpec, PostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { set: { type: "string", multiple: true, default: [] }, slug: { type: "string" }, "no-row": { type: "boolean", default: false } },
});
const [file, variantId] = positionals;
if (!file || !variantId || !/^[A-Z][A-Za-z0-9-]*$/.test(variantId)) {
  console.error('usage: node scripts/variant.ts <spec.json> <VARIANT e.g. B> --set path=value [--set ...] [--slug s] [--no-row]');
  process.exit(2);
}
const source = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
const slug = values.slug ?? `${source.slug}-${variantId.toLowerCase()}`;
raw.slug = slug;
(raw.brief as Record<string, unknown>).variantId = variantId;
for (const assignment of values.set) {
  const eq = assignment.indexOf("=");
  if (eq < 0) {
    console.error(`--set expects path=value, got ${assignment}`);
    process.exit(2);
  }
  applySet(raw, assignment.slice(0, eq), assignment.slice(eq + 1));
}
const parsed = PostSpec.safeParse(raw);
if (!parsed.success) {
  console.error("variant is invalid:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(1);
}
const target = path.join("content/posts", `${slug}.json`);
if (existsSync(target)) {
  console.error(`${target} already exists`);
  process.exit(2);
}
writeFileSync(target, JSON.stringify(raw, null, 2) + "\n");
console.log(`wrote ${target} (variant ${variantId} of ${source.brief.experimentId ?? "no experiment"})`);

if (!values["no-row"] && source.brief.experimentId) {
  const data = readExperiments();
  const sourceRow = data.raw.find((r) => r.experiment_id === source.brief.experimentId && r.variant_id === (source.brief.variantId ?? "A"));
  const exists = data.raw.some((r) => r.experiment_id === source.brief.experimentId && r.variant_id === variantId);
  if (exists) {
    console.log(`row ${source.brief.experimentId}/${variantId} already in data/experiments.csv`);
  } else {
    const row: Record<string, string> = {
      ...(sourceRow ?? {}),
      experiment_id: source.brief.experimentId,
      variant_id: variantId,
      post_slug: slug,
      archetype: parsed.data.brief.archetype,
      hypothesis: parsed.data.brief.hypothesis ?? sourceRow?.hypothesis ?? "",
      success_metric: sourceRow?.success_metric ?? "",
      status: "draft",
      published_at: "",
      post_url: "",
      notes: `variant of ${source.slug}: ${values.set.join("; ")}`,
    };
    for (const k of ["reach", "plays", "avg_watch_time_sec", "completion_rate", "likes", "comments", "saves", "shares", "profile_visits", "link_clicks", "inquiries", "qualified_inquiries", "bookings", "revenue_eur", "contribution_margin_eur"]) row[k] = "";
    writeExperiments([...data.raw, row]);
    console.log(`added row ${source.brief.experimentId}/${variantId} to data/experiments.csv`);
  }
}
