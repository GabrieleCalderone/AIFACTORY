/**
 * Schedule a rendered, hosted post through Buffer on every connected platform:
 * reel -> Instagram, TikTok, YouTube Shorts, Facebook (staggered by an hour);
 * carousel -> Instagram and Facebook two days later. Without BUFFER_API_KEY and a channel
 * map it is a dry run that prints the exact payloads.
 *
 *   node --env-file-if-exists=.env scripts/publish.ts content/posts/<slug>.json [--when ISO] [--dry-run]
 *   .env: BUFFER_API_KEY=...  BUFFER_CHANNELS=instagram:ID,tiktok:ID,facebook:ID,youtube:ID
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createBufferClient, type BufferAsset } from "../src/adapters/buffer.ts";
import { captionFor, distribution, parseChannels, type Platform } from "../src/lib/channels.ts";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";
import { gateSpec } from "../src/lib/gate-io.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { loadPipeline, setState } from "../src/lib/pipeline-io.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { when: { type: "string" }, "dry-run": { type: "boolean", default: false }, draft: { type: "boolean", default: false }, out: { type: "string", default: "out" } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/publish.ts content/posts/<slug>.json [--when ISO] [--dry-run]");
  process.exit(2);
}
const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
if (existsSync("STOP")) {
  console.log("[publish] STOP file present: nothing sent");
  process.exit(0);
}
const gateResult = gateSpec(spec);
if (gateResult.errors.length) {
  gateResult.errors.forEach((e) => console.error(`[publish] gate ERROR ${e}`));
  process.exit(1);
}
// Approval: a human (console) or AUTOPUBLISH=true after the loop has been validated end-to-end.
const pipelineState = loadPipeline()[spec.slug]?.state ?? null;
const autoApprove = process.env.AUTOPUBLISH === "true";
if (!values["dry-run"] && !values.draft && pipelineState !== "APPROVED" && !autoApprove) {
  console.log(`[publish] ${spec.slug} is ${pipelineState ?? "not in the pipeline"}: approve it in the console (or set AUTOPUBLISH=true) before scheduling; use --draft to save Buffer drafts instead`);
  process.exit(0);
}
if (pipelineState === "SCHEDULED" || pipelineState === "PUBLISHED" || pipelineState === "MEASURED") {
  console.log(`[publish] ${spec.slug} already ${pipelineState}: not scheduling twice`);
  process.exit(0);
}
const outDir = path.join(values.out, spec.slug);
const hostedPath = path.join(outDir, "hosted.json");
if (!existsSync(hostedPath)) {
  console.error(`host the media first: ${hostedPath} missing (node scripts/host-media.ts ${file})`);
  process.exit(1);
}
const hosted = JSON.parse(readFileSync(hostedPath, "utf8")) as { reel?: string; cover?: string; carousel?: string[]; dryRun?: boolean };
const apiKey = process.env.BUFFER_API_KEY;
const channels = parseChannels(process.env);
const dryRun = values["dry-run"] || !apiKey || Object.keys(channels).length === 0 || hosted.dryRun === true;
const when = values.when ? new Date(values.when) : new Date(Date.now() + 2 * 3600 * 1000);
if (Number.isNaN(when.getTime())) {
  console.error("--when must be an ISO 8601 date");
  process.exit(2);
}
const full = buildCaption(spec);
const hookTitle = spec.reel?.hook.title ?? spec.title;
type Job = { kind: "reel" | "carousel"; platform: Platform; channelId: string; text: string; assets: BufferAsset[]; dueAt: string; metadata?: Record<string, unknown> };
const jobs: Job[] = [];
const target = (platform: Platform) => (dryRun ? channels[platform] ?? `<${platform} channel>` : channels[platform]);
if (spec.reel && hosted.reel) {
  for (const d of distribution.reel) {
    const channelId = target(d.platform);
    if (!channelId) continue;
    const dueAt = new Date(when.getTime() + d.offsetHours * 3600 * 1000).toISOString();
    const metadata = d.platform === "instagram" ? { instagram: { type: "reel", shouldShareToFeed: true } } : d.platform === "youtube" ? { youtube: { title: hookTitle.slice(0, 100) } } : undefined;
    jobs.push({ kind: "reel", platform: d.platform, channelId, text: captionFor(d.platform, full, spec.hashtags, hookTitle), assets: [{ video: { url: hosted.reel, metadata: { thumbnailOffset: 1500 } } }], dueAt, metadata });
  }
}
if (spec.carousel && hosted.carousel?.length) {
  for (const d of distribution.carousel) {
    const channelId = target(d.platform);
    if (!channelId) continue;
    const dueAt = new Date(when.getTime() + d.offsetHours * 3600 * 1000).toISOString();
    jobs.push({ kind: "carousel", platform: d.platform, channelId, text: captionFor(d.platform, full, spec.hashtags, hookTitle), assets: hosted.carousel.map((url) => ({ image: { url } })), dueAt, metadata: d.platform === "instagram" ? { instagram: { type: "post", shouldShareToFeed: true } } : undefined });
  }
}
if (jobs.length === 0) {
  console.error("nothing to publish: no hosted media or no channels configured");
  process.exit(1);
}
if (dryRun) {
  for (const j of jobs) console.log(`[publish] DRY RUN ${spec.slug} ${j.kind} -> ${j.platform} (${j.channelId}) at ${j.dueAt}: ${j.assets.length} asset(s), text "${j.text.split("\n")[0].slice(0, 60)}..."`);
  console.log(`[publish] ${apiKey && Object.keys(channels).length ? "dry run requested" : "no BUFFER_API_KEY/BUFFER_CHANNELS: nothing sent"}; set the keys in .env to publish`);
  process.exit(0);
}
const buffer = createBufferClient({ apiKey: apiKey! });
const publications = existsSync("data/publications.json") ? (JSON.parse(readFileSync("data/publications.json", "utf8")) as Record<string, unknown>[]) : [];
const already = new Set(publications.filter((p) => p.slug === spec.slug).map((p) => `${p.kind}:${p.platform ?? "instagram"}`));
const results: Record<string, unknown>[] = [];
let failures = 0;
for (const j of jobs) {
  if (already.has(`${j.kind}:${j.platform}`)) {
    console.log(`[publish] ${spec.slug} ${j.kind} -> ${j.platform}: already in Buffer, skipped`);
    continue;
  }
  try {
    const post = await buffer.createPost({ channelId: j.channelId, text: j.text, assets: j.assets, mode: "customScheduled", dueAt: j.dueAt, metadata: j.metadata, draft: values.draft });
    console.log(`[publish] ${spec.slug} ${j.kind} -> ${j.platform}: Buffer post ${post.id} due ${post.dueAt ?? j.dueAt}`);
    results.push({ slug: spec.slug, kind: j.kind, platform: j.platform, bufferPostId: post.id, dueAt: post.dueAt ?? j.dueAt, draft: values.draft, experimentId: spec.brief.experimentId ?? null, variantId: spec.brief.variantId ?? null, createdAt: new Date().toISOString() });
  } catch (e) {
    failures++;
    console.error(`[publish] ${spec.slug} ${j.kind} -> ${j.platform} FAILED: ${e instanceof Error ? e.message : e}`);
  }
}
if (results.length) {
  writeFileSync("data/publications.json", JSON.stringify([...publications, ...results], null, 2) + "\n");
  writeFileSync(path.join(outDir, "published.json"), JSON.stringify(results, null, 2) + "\n");
  if (spec.brief.experimentId && !values.draft) {
    const data = readExperiments();
    const idx = data.raw.findIndex((r) => r.experiment_id === spec.brief.experimentId && r.variant_id === (spec.brief.variantId ?? "A"));
    if (idx >= 0) {
      data.raw[idx] = { ...data.raw[idx], status: "scheduled", published_at: String(results[0].dueAt) };
      writeExperiments(data.raw);
    }
  }
  if (!values.draft) setState(spec.slug, "SCHEDULED", `${results.length} Buffer post(s)`, { bufferPostIds: results.map((r) => String(r.bufferPostId)) });
  else console.log(`[publish] ${results.length} Buffer draft(s) saved; schedule them in Buffer or approve here`);
}
process.exit(failures > 0 && results.length === 0 ? 1 : 0);
