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
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { createBufferClient, type BufferAsset } from "../src/adapters/buffer.ts";
import { captionFor, distributionFor, materialOf, parseChannels, postMetadata, type Platform } from "../src/lib/channels.ts";
import { readExperiments, writeExperiments } from "../src/lib/data.ts";
import { generatedIn, isContext, isGenerated } from "../src/lib/context.ts";
import { contextRows, gateSpec } from "../src/lib/gate-io.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { loadPipeline, setState } from "../src/lib/pipeline-io.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { when: { type: "string" }, "dry-run": { type: "boolean", default: false }, draft: { type: "boolean", default: false }, out: { type: "string", default: "out" }, missing: { type: "boolean", default: false } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/publish.ts content/posts/<slug>.json [--when ISO] [--dry-run] [--missing]");
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
// --missing completes a post that is already SCHEDULED. Being scheduled is not taken as approval of
// whatever the file says today: the file must be the one a person approved (same hash).
const completing = values.missing && pipelineState === "SCHEDULED";
if (!values["dry-run"] && !values.draft && pipelineState !== "APPROVED" && !autoApprove && !completing) {
  console.log(`[publish] ${spec.slug} is ${pipelineState ?? "not in the pipeline"}: approve it in the console (or set AUTOPUBLISH=true) before scheduling; use --draft to save Buffer drafts instead`);
  process.exit(0);
}
// --missing completes a post that was scheduled only in part (a format was not rendered at the time):
// publications already in Buffer are skipped one by one further down, so nothing is sent twice.
if (!values["dry-run"] && !values.draft && !autoApprove) {
  const approvedSha = loadPipeline()[spec.slug]?.evidence?.approvedSha;
  const nowSha = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (approvedSha !== nowSha) {
    console.log(`[publish] ${spec.slug}: ${approvedSha ? "the post changed after it was approved" : "no approval recorded for this version of the post"}; approve it again in the console`);
    process.exit(0);
  }
}
if ((pipelineState === "SCHEDULED" && !values.missing) || pipelineState === "PUBLISHED" || pipelineState === "MEASURED") {
  console.log(`[publish] ${spec.slug} already ${pipelineState}: not scheduling twice`);
  process.exit(0);
}
const outDir = path.join(values.out, spec.slug);
const dryRunRequested = values["dry-run"];
const hostedPath = path.join(outDir, "hosted.json");
if (!existsSync(hostedPath)) {
  console.error(`host the media first: ${hostedPath} missing (node scripts/host-media.ts ${file})`);
  process.exit(1);
}
const hosted = JSON.parse(readFileSync(hostedPath, "utf8")) as { reel?: string; cover?: string; carousel?: string[]; dryRun?: boolean; version?: string };
// What goes out is the post as it was rendered, hosted and approved, not something edited since:
// the hosted files must be those of the post file as it is now. Checked for every real publication.
if (!dryRunRequested && hosted.dryRun !== true) {
  const now = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (!hosted.version || !now.startsWith(hosted.version)) {
    console.error(`[publish] ${spec.slug}: the post changed after its files were hosted; render, host and approve it again before publishing`);
    process.exit(1);
  }
}
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
const material = materialOf(spec.reel);
const distribution = distributionFor(material);
console.log(`[publish] ${spec.slug}: ${material === "video" ? "real footage, the reel leads" : "photographs only, the carousel leads"}`);
// Alt text for each carousel image: what the slide says, or a plain description, always with the house and the place.
const altTextFor = (i: number): string => {
  const slide = spec.carousel?.slides[i];
  // A licensed picture of the place is described as what it is, never as the house's dish.
  const image = slide && "image" in slide ? slide.image : undefined;
  if (isContext(image)) {
    // Decided by where the picture lives, not by finding its record: anything that is not the house's own is never called a dish of the chef.
    const subject = contextRows().find((r) => `assets/context/${r.file}` === image)?.subject ?? "the island";
    return `Sicily: ${subject}${isGenerated(image) ? " (illustration made with AI)" : ""}. Shared by RistHome, private chef and cooking classes in Palermo.`.slice(0, 1000);
  }
  const said = slide ? [("title" in slide && slide.title) || "", ("body" in slide && slide.body) || ""].filter(Boolean).join(". ") : "";
  const what = said || (spec.lang === "it" ? "Un piatto dello chef Giacomo Napolitano" : "A dish by Chef Giacomo Napolitano");
  return `${what}. RistHome, ${spec.lang === "it" ? "chef a domicilio e lezioni di cucina a Palermo" : "private chef and cooking classes in Palermo, Sicily"}.`.slice(0, 1000);
};
// The AI disclosure follows the format that carries generated material, read from the spec itself.
const found = generatedIn(spec);
// A post declared as AI content whose generated material this check cannot locate is disclosed on
// both formats: a declaration is narrowed to one format only when the material was actually found there.
const unlocated = spec.aiGenerated === true && found.reel.length + found.carousel.length === 0;
const made = { reel: unlocated || found.reel.length > 0, carousel: unlocated || found.carousel.length > 0 };
const target = (platform: Platform) => (dryRun ? channels[platform] ?? `<${platform} channel>` : channels[platform]);
if (spec.reel && hosted.reel) {
  for (const d of distribution.reel) {
    const channelId = target(d.platform);
    if (!channelId) continue;
    const dueAt = new Date(when.getTime() + d.offsetHours * 3600 * 1000).toISOString();
    const metadata = postMetadata(d.platform, "reel", { aiGenerated: made.reel, title: hookTitle });
    if (metadata === null) {
      console.log(`[publish] ${spec.slug} reel -> ${d.platform}: skipped, this post contains generated material and ${d.platform} has no AI disclosure through Buffer`);
      continue;
    }
    jobs.push({ kind: "reel", platform: d.platform, channelId, text: captionFor(d.platform, full, spec.hashtags, hookTitle), assets: [{ video: { url: hosted.reel, metadata: { thumbnailOffset: 1500 } } }], dueAt, metadata });
  }
}
if (spec.carousel && hosted.carousel?.length) {
  for (const d of distribution.carousel) {
    const channelId = target(d.platform);
    if (!channelId) continue;
    const dueAt = new Date(when.getTime() + d.offsetHours * 3600 * 1000).toISOString();
    const metadata = postMetadata(d.platform, "carousel", { aiGenerated: made.carousel, title: hookTitle });
    if (metadata === null) {
      console.log(`[publish] ${spec.slug} carousel -> ${d.platform}: skipped, this post contains generated material and ${d.platform} has no AI disclosure for this format through Buffer`);
      continue;
    }
    jobs.push({ kind: "carousel", platform: d.platform, channelId, text: captionFor(d.platform, full, spec.hashtags, hookTitle), assets: hosted.carousel.map((url, i) => ({ image: { url, ...(d.platform === "instagram" ? { metadata: { altText: altTextFor(i) } } : {}) } })), dueAt, metadata });
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
    // Recorded at once: a run that stops half way must not leave a Buffer post this file does not know, or the next run would send it again.
    writeFileSync("data/publications.json", JSON.stringify([...publications, ...results], null, 2) + "\n");
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
  // every Buffer post of this slug, earlier runs included
  const allIds = [...publications.filter((p) => p.slug === spec.slug && !p.draft), ...results].map((r) => String(r.bufferPostId));
  if (!values.draft) setState(spec.slug, "SCHEDULED", `${results.length} Buffer post(s)`, { bufferPostIds: [...new Set(allIds)] });
  else console.log(`[publish] ${results.length} Buffer draft(s) saved; schedule them in Buffer or approve here`);
}
process.exit(failures > 0 && results.length === 0 ? 1 : 0);
