/**
 * Record measured metrics for one variant in data/experiments.csv. Numbers come from
 * Instagram Insights, GA4 and the CRM; anything not passed stays as it was.
 *
 *   node scripts/log-metrics.ts EXP-001 A --published-at 2026-11-10T18:00:00Z --post-url https://... \
 *     --reach 1200 --plays 950 --avg-watch-time-sec 9.4 --saves 31 --link-clicks 12 --inquiries 3 \
 *     --qualified-inquiries 2 --bookings 1 --revenue-eur 240 [--status measured] [--notes "..."]
 */
import { parseArgs } from "node:util";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";
import { ExperimentRow, METRIC_COLUMNS } from "../src/schemas/experiment.ts";

const metricOptions = Object.fromEntries(METRIC_COLUMNS.map((c) => [c.replace(/_/g, "-"), { type: "string" as const }]));
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { ...metricOptions, "published-at": { type: "string" }, "post-url": { type: "string" }, status: { type: "string" }, notes: { type: "string" } },
});
const [experimentId, variantId] = positionals;
if (!experimentId || !variantId) {
  console.error("usage: node scripts/log-metrics.ts <EXP-id> <variant> --reach N --plays N ...");
  process.exit(2);
}
const data = readExperiments();
if (data.issues.length) {
  for (const i of data.issues) console.error(`${i.file}:${i.row}: ${i.message}`);
  process.exit(1);
}
const idx = data.raw.findIndex((r) => r.experiment_id === experimentId && r.variant_id === variantId);
if (idx < 0) {
  console.error(`no row for ${experimentId} variant ${variantId}`);
  process.exit(2);
}
const row = { ...data.raw[idx] };
let changed = 0;
for (const c of METRIC_COLUMNS) {
  const v = (values as Record<string, string | undefined>)[c.replace(/_/g, "-")];
  if (v !== undefined) {
    row[c] = v;
    changed++;
  }
}
if (values["published-at"] !== undefined) row.published_at = values["published-at"];
if (values["post-url"] !== undefined) row.post_url = values["post-url"];
if (values.notes !== undefined) row.notes = values.notes;
row.status = values.status ?? (changed > 0 ? "measured" : row.published_at ? "published" : row.status);
const parsed = ExperimentRow.safeParse(row);
if (!parsed.success) {
  console.error("invalid row:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(2);
}
data.raw[idx] = row;
writeExperiments(data.raw);
console.log(`updated ${experimentId}/${variantId}: ${changed} metric(s), status=${row.status}`);
