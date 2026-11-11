/**
 * Score every pool photo for every service and format with the Visual Quality & Brand Fit
 * Engine, write data/asset-scores.json (verdicts with reasons) and merge a summary into the
 * pool manifest (best tier/score per service) so the author and the console can use it.
 *
 *   node scripts/score-assets.ts [--pool pool] [--technical data/asset-technical.json]
 *   Overrides (human): data/asset-overrides.json  { "<file>": { "include": true } | { "exclude": true, "note": "..." } }
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  defaultWeights,
  scoreAsset,
  thresholds,
  type CatalogRow,
  type Format,
  type Override,
  type Service,
  type TechnicalRow,
  type Verdict,
} from "../src/lib/visual-score.ts";

const { values } = parseArgs({
  options: {
    pool: { type: "string", default: "pool" },
    technical: { type: "string", default: "data/asset-technical.json" },
    catalog: { type: "string", default: "data/asset-catalog.json" },
  },
});
const poolDir = path.join("public/assets", values.pool);
const manifestPath = path.join(poolDir, "manifest.json");
type PoolRow = {
  file: string;
  source: string;
  width: number;
  height: number;
  people: string;
} & Record<string, unknown>;
const pool = JSON.parse(readFileSync(manifestPath, "utf8")) as PoolRow[];

// Technical analysis is deterministic and cached by sha256; run it (fast) so new photos are covered.
execFileSync(
  "uv",
  [
    "run",
    "python",
    "-I",
    "tools/py/analyze_assets.py",
    poolDir,
    "--out",
    values.technical,
  ],
  { stdio: "inherit" },
);
const technical = JSON.parse(readFileSync(values.technical, "utf8")) as Record<
  string,
  TechnicalRow
>;
const catalog = JSON.parse(readFileSync(values.catalog, "utf8")) as Record<
  string,
  CatalogRow & { source: string }
>;
const usage = existsSync("data/asset-usage.json")
  ? (JSON.parse(readFileSync("data/asset-usage.json", "utf8")) as Record<
      string,
      string[]
    >)
  : {};
const overrides = existsSync("data/asset-overrides.json")
  ? (JSON.parse(readFileSync("data/asset-overrides.json", "utf8")) as Record<
      string,
      Override
    >)
  : {};

const services: Service[] = ["class", "chef"];
const formats: Format[] = ["reel", "carousel"];
const groupUsed = new Map<number, number>();
for (const row of pool) {
  const t = technical[row.file];
  if (!t) continue;
  const n = (usage[row.file] ?? []).length;
  if (n > 0) groupUsed.set(t.dup_group, (groupUsed.get(t.dup_group) ?? 0) + n);
}

const verdicts: Record<string, Record<string, Verdict>> = {};
let missing = 0;
for (const row of pool) {
  const t = technical[row.file];
  const c = catalog[row.source];
  if (!t || !c) {
    missing++;
    continue;
  }
  const usedTimes = (usage[row.file] ?? []).length;
  const groupUsedTimes = Math.max(
    0,
    (groupUsed.get(t.dup_group) ?? 0) - usedTimes,
  );
  verdicts[row.file] = {};
  for (const service of services) {
    for (const format of formats) {
      verdicts[row.file][`${service}:${format}`] = scoreAsset({
        tech: t,
        cat: c,
        service,
        format,
        usedTimes,
        groupUsedTimes,
        override: overrides[row.file],
      });
    }
  }
  const best = Object.values(verdicts[row.file]).reduce((a, b) =>
    b.Q > a.Q ? b : a,
  );
  Object.assign(row, {
    score_best: best.Q,
    tier_best: best.tier,
    best_for: `${best.service}:${best.format}`,
    blocked: best.blocked,
    scores: Object.fromEntries(
      Object.entries(verdicts[row.file]).map(([k, v]) => [
        k,
        { Q: v.Q, tier: v.tier },
      ]),
    ),
    reasons: best.reasons,
  });
}
writeFileSync(manifestPath, JSON.stringify(pool, null, 2) + "\n");
writeFileSync(
  "data/asset-scores.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      weights: defaultWeights,
      thresholds,
      verdicts,
    },
    null,
    1,
  ) + "\n",
);

const count = (service: Service, format: Format, tier: Verdict["tier"]) =>
  Object.values(verdicts).filter(
    (v) => v[`${service}:${format}`]?.tier === tier,
  ).length;
console.log(
  `scored ${Object.keys(verdicts).length} photos (${missing} without technical/catalogue data) -> data/asset-scores.json`,
);
for (const service of services) {
  console.log(
    `${service.padEnd(7)} reel: premium ${count(service, "reel", "premium")} usable ${count(service, "reel", "usable")} excluded ${count(service, "reel", "excluded")} blocked ${count(service, "reel", "blocked")} | carousel: premium ${count(service, "carousel", "premium")} usable ${count(service, "carousel", "usable")}`,
  );
}
