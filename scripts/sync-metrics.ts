/**
 * Pull post metrics from Buffer for every publication older than 24 h and write them into
 * data/experiments.csv (status measured, post_url from Buffer's externalLink). Buffer
 * refreshes daily, so this runs on every autopilot cycle and keeps the highest value seen.
 *
 *   node --env-file-if-exists=.env scripts/sync-metrics.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createBufferClient, metricsToColumns } from "../src/adapters/buffer.ts";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";

const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) {
  console.log("[metrics] no BUFFER_API_KEY: nothing to sync");
  process.exit(0);
}
if (!existsSync("data/publications.json")) {
  console.log("[metrics] no publications yet");
  process.exit(0);
}
type Pub = { slug: string; kind: string; platform?: string; bufferPostId: string; dueAt: string | null; experimentId: string | null; variantId: string | null; postUrl?: string; lastSync?: string; metrics?: Record<string, number> };
const pubs = JSON.parse(readFileSync("data/publications.json", "utf8")) as Pub[];
const buffer = createBufferClient({ apiKey });
const data = readExperiments();
const dayAgo = Date.now() - 24 * 3600 * 1000;
let updated = 0;
for (const pub of pubs) {
  if (!pub.experimentId || !pub.dueAt || new Date(pub.dueAt).getTime() > dayAgo) continue;
  try {
    const m = await buffer.postMetrics(pub.bufferPostId);
    const cols = metricsToColumns(m.metrics);
    pub.metrics = cols;
    pub.lastSync = new Date().toISOString();
    if (m.externalLink) pub.postUrl = m.externalLink;
    // The experiment row tracks Instagram (the primary channel); other platforms stay in publications.json.
    if ((pub.platform ?? "instagram") !== "instagram") {
      console.log(`[metrics] ${pub.slug} ${pub.kind} ${pub.platform}: ${Object.keys(cols).length} metrics kept in publications.json`);
      updated++;
      continue;
    }
    const idx = data.raw.findIndex((r) => r.experiment_id === pub.experimentId && r.variant_id === (pub.variantId ?? "A"));
    if (idx < 0) continue;
    const row = { ...data.raw[idx] };
    for (const [k, v] of Object.entries(cols)) {
      const prev = Number(row[k] || 0);
      row[k] = String(Math.max(prev, v));
    }
    if (m.externalLink && !row.post_url) row.post_url = m.externalLink;
    if (Object.keys(cols).length > 0) row.status = "measured";
    else if (row.status === "scheduled" && m.status === "sent") row.status = "published";
    data.raw[idx] = row;
    updated++;
    console.log(`[metrics] ${pub.slug} ${pub.kind}: ${Object.keys(cols).length} metrics (${m.metricsUpdatedAt ?? "no timestamp"})`);
  } catch (e) {
    console.warn(`[metrics] ${pub.slug} ${pub.kind}: ${e instanceof Error ? e.message : e}`);
  }
}
writeExperiments(data.raw);
writeFileSync("data/publications.json", JSON.stringify(pubs, null, 2) + "\n");
console.log(`[metrics] synced ${updated} publication(s)`);
