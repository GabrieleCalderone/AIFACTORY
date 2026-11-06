/**
 * Compare the variants of one experiment on a rate metric with 95% Wilson intervals.
 *
 *   node scripts/compare.ts EXP-001 [--metric saves --base reach]
 */
import { parseArgs } from "node:util";
import { readExperiments } from "../src/lib/data.ts";
import { compareRates, pct, verdict } from "../src/lib/stats.ts";
import { METRIC_COLUMNS, type MetricColumn } from "../src/schemas/experiment.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { metric: { type: "string", default: "saves" }, base: { type: "string", default: "reach" } } });
const [experimentId] = positionals;
const metric = values.metric as MetricColumn;
const base = values.base as MetricColumn;
if (!experimentId || !METRIC_COLUMNS.includes(metric) || !METRIC_COLUMNS.includes(base)) {
  console.error(`usage: node scripts/compare.ts <EXP-id> --metric <${METRIC_COLUMNS.join("|")}> --base <column>`);
  process.exit(2);
}
const { records, issues } = readExperiments();
if (issues.length) {
  for (const i of issues) console.error(`${i.file}:${i.row}: ${i.message}`);
  process.exit(1);
}
const rows = records.filter((r) => r.experiment_id === experimentId);
if (rows.length === 0) {
  console.error(`no rows for ${experimentId}`);
  process.exit(1);
}
const results = compareRates(rows.map((r) => ({ variant: r.variant_id, label: r.post_slug, successes: r[metric] as number | null, n: r[base] as number | null })));
for (const r of results) {
  if (r.status === "ok") console.log(`${r.variant.padStart(3)} ${r.label.padEnd(28)} ${metric}/${base} = ${r.successes}/${r.n} = ${pct(r.rate, 2)}  95% CI [${pct(r.low, 2)}, ${pct(r.high, 2)}]`);
  else console.log(`${r.variant.padStart(3)} ${r.label.padEnd(28)} no data for ${metric}/${base}`);
}
console.log("verdict:", verdict(results));
