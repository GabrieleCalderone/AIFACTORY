/**
 * Schedule a rendered, hosted post on Instagram through Buffer. Without BUFFER_API_KEY and
 * BUFFER_CHANNEL_ID in the environment it is a dry run that prints the exact payloads.
 * A reel+carousel spec becomes two Buffer posts: the reel at --when, the carousel two days later.
 *
 *   node --env-file-if-exists=.env scripts/publish.ts content/posts/<slug>.json [--when 2026-11-12T17:00:00Z] [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createBufferClient, type BufferAsset } from "../src/adapters/buffer.ts";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { when: { type: "string" }, "dry-run": { type: "boolean", default: false }, out: { type: "string", default: "out" } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/publish.ts content/posts/<slug>.json [--when ISO] [--dry-run]");
  process.exit(2);
}
const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
const outDir = path.join(values.out, spec.slug);
const hostedPath = path.join(outDir, "hosted.json");
if (!existsSync(hostedPath)) {
  console.error(`host the media first: ${hostedPath} missing (node scripts/host-media.ts ${file})`);
  process.exit(1);
}
const hosted = JSON.parse(readFileSync(hostedPath, "utf8")) as { reel?: string; cover?: string; carousel?: string[]; dryRun?: boolean };
const apiKey = process.env.BUFFER_API_KEY;
const channelId = process.env.BUFFER_CHANNEL_ID;
const dryRun = values["dry-run"] || !apiKey || !channelId || hosted.dryRun === true;
const when = values.when ? new Date(values.when) : null;
if (when && Number.isNaN(when.getTime())) {
  console.error("--when must be an ISO 8601 date");
  process.exit(2);
}
const caption = buildCaption(spec);
const plan: { kind: "reel" | "carousel"; text: string; assets: BufferAsset[]; dueAt?: string; metadata?: Record<string, unknown> }[] = [];
if (spec.reel && hosted.reel) {
  plan.push({ kind: "reel", text: caption, assets: [{ video: { url: hosted.reel, metadata: { thumbnailOffset: 1500 } } }], dueAt: when?.toISOString(), metadata: { instagram: { type: "reel", shareToFeed: true } } });
}
if (spec.carousel && hosted.carousel?.length) {
  const later = when ? new Date(when.getTime() + 2 * 24 * 3600 * 1000).toISOString() : undefined;
  plan.push({ kind: "carousel", text: caption, assets: hosted.carousel.map((url) => ({ image: { url } })), dueAt: later, metadata: { instagram: { type: "post" } } });
}
if (plan.length === 0) {
  console.error("nothing to publish: no hosted reel or carousel");
  process.exit(1);
}

const publications = existsSync("data/publications.json") ? (JSON.parse(readFileSync("data/publications.json", "utf8")) as Record<string, unknown>[]) : [];
const results: Record<string, unknown>[] = [];
if (dryRun) {
  for (const p of plan) console.log(`[publish] DRY RUN ${spec.slug} ${p.kind}: ${JSON.stringify({ channelId: channelId ?? "<BUFFER_CHANNEL_ID>", mode: p.dueAt ? "customScheduled" : "addToQueue", dueAt: p.dueAt, assets: p.assets, metadata: p.metadata, text: p.text.slice(0, 80) + "..." })}`);
  console.log(`[publish] ${apiKey && channelId ? "dry run requested" : "no BUFFER_API_KEY/BUFFER_CHANNEL_ID: nothing sent"}; set the keys in .env to publish`);
  process.exit(0);
}
const buffer = createBufferClient({ apiKey: apiKey! });
for (const p of plan) {
  const post = await buffer.createPost({ channelId: channelId!, text: p.text, assets: p.assets, mode: p.dueAt ? "customScheduled" : "addToQueue", dueAt: p.dueAt, metadata: p.metadata });
  console.log(`[publish] ${spec.slug} ${p.kind}: Buffer post ${post.id} due ${post.dueAt ?? "next free slot"}`);
  results.push({ slug: spec.slug, kind: p.kind, bufferPostId: post.id, dueAt: post.dueAt ?? p.dueAt ?? null, experimentId: spec.brief.experimentId ?? null, variantId: spec.brief.variantId ?? null, createdAt: new Date().toISOString() });
}
writeFileSync("data/publications.json", JSON.stringify([...publications, ...results], null, 2) + "\n");
writeFileSync(path.join(outDir, "published.json"), JSON.stringify(results, null, 2) + "\n");
if (spec.brief.experimentId) {
  const data = readExperiments();
  const idx = data.raw.findIndex((r) => r.experiment_id === spec.brief.experimentId && r.variant_id === (spec.brief.variantId ?? "A"));
  if (idx >= 0) {
    data.raw[idx] = { ...data.raw[idx], status: "scheduled", published_at: String(results[0].dueAt ?? new Date().toISOString()) };
    writeExperiments(data.raw);
  }
}
