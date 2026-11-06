/**
 * Build the hand-off package for manual posting or for a future scheduler adapter:
 * out/<slug>/publish.json with absolute media paths, caption, hashtags, experiment ids,
 * a UTM link for the bio and a checklist. Nothing is sent anywhere: the brief forbids
 * autopublishing without approval, and no social account is connected.
 *
 *   node scripts/publish-pack.ts content/posts/<slug>.json [--schedule 2026-11-12T18:00:00+01:00]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gateSpec } from "../src/lib/gate-io.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { theme } from "../src/brand/theme.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { schedule: { type: "string" }, out: { type: "string", default: "out" } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/publish-pack.ts content/posts/<slug>.json [--schedule ISO-8601]");
  process.exit(2);
}
const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
const outDir = path.join(values.out, spec.slug);
const manifestPath = path.join(outDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`render first: ${manifestPath} not found`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { reel?: { file: string; cover?: string; durationSec: number }; carousel?: { file: string }[] };
const gate = gateSpec(spec);
const utm = `https://risthome.it/?utm_source=instagram&utm_medium=social&utm_campaign=${spec.brief.experimentId ?? "organic"}&utm_content=${spec.slug}`;
const pack = {
  slug: spec.slug,
  title: spec.title,
  lang: spec.lang,
  status: "ready",
  experiment: { id: spec.brief.experimentId ?? null, variant: spec.brief.variantId ?? null, archetype: spec.brief.archetype, hypothesis: spec.brief.hypothesis ?? null },
  schedule: values.schedule ?? null,
  platform: "instagram",
  reel: manifest.reel ? { file: path.resolve(manifest.reel.file), cover: manifest.reel.cover ? path.resolve(manifest.reel.cover) : null, durationSec: manifest.reel.durationSec, shareToFeed: true } : null,
  carousel: manifest.carousel ? manifest.carousel.map((s) => path.resolve(s.file)) : null,
  caption: buildCaption(spec),
  bioLink: utm,
  handle: theme.handle,
  gate,
  checklist: [
    "automated: texts reviewed against the photos, gate passed, CC BY audio attached",
    "bio link: keep risthome.it in the Instagram bio (UTM link above is optional)",
    "publishing: npm run publish -- <spec> or the console button; metrics sync daily",
  ],
};
const target = path.join(outDir, "publish.json");
writeFileSync(target, JSON.stringify(pack, null, 2) + "\n");
console.log(`wrote ${target} (status ready; ${gate.errors.length} gate errors, ${gate.warnings.length} warnings)`);
