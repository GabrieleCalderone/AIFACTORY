/**
 * Creative brief generator: scaffold content/posts/<slug>.json from an archetype.
 *
 *   node scripts/new-post.ts <slug> --archetype A1-process-reveal --lang en [--experiment EXP-004] [--variant A]
 *
 * If public/assets/<slug>/manifest.json exists (see `npm run assets`), its photos fill the
 * reel scenes and carousel slides in order; every text is a TODO to be written by a human
 * or an LLM from the brief. Strategy (brief) stays separate from rendering details.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    archetype: { type: "string" },
    lang: { type: "string", default: "it" },
    experiment: { type: "string" },
    variant: { type: "string", default: "A" },
    force: { type: "boolean", default: false },
  },
});

type Archetype = {
  id: string;
  name: string;
  briefDefaults: { audience: string; objective: string; hook: string; cta: string; hypothesisTemplate: string };
  formats: {
    reel?: { hookDurationSec: number; sceneDurationSec: number; sceneCount: number; motions: string[]; labels?: string[] };
    carousel?: { slides: string[] };
  };
};

const slug = positionals[0];
const lang = values.lang;
if (!slug || !values.archetype || (lang !== "it" && lang !== "en")) {
  console.error("usage: node scripts/new-post.ts <slug> --archetype <A1..A5 id> --lang it|en [--experiment EXP-00N] [--variant A]");
  process.exit(2);
}
const catalog = JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: Archetype[] };
const archetype = catalog.archetypes.find((a) => a.id === values.archetype);
if (!archetype) {
  console.error(`unknown archetype ${values.archetype}; available: ${catalog.archetypes.map((a) => a.id).join(", ")}`);
  process.exit(2);
}
const target = path.join("content/posts", `${slug}.json`);
if (existsSync(target) && !values.force) {
  console.error(`${target} exists; pass --force to overwrite`);
  process.exit(2);
}

const manifestPath = path.join("public/assets", slug, "manifest.json");
const assets: string[] = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { file: string }[]).map((r) => `assets/${slug}/${r.file}`)
  : [];
const imageAt = (i: number) => assets[i % Math.max(assets.length, 1)] ?? `assets/${slug}/TODO-${String(i + 1).padStart(2, "0")}.jpg`;

const d = archetype.briefDefaults;
const spec: Record<string, unknown> = {
  slug,
  lang,
  title: `TODO: working title for ${slug}`,
  brief: {
    archetype: archetype.id,
    audience: d.audience,
    objective: d.objective,
    hook: d.hook,
    sequence: ["TODO: beat 1", "TODO: beat 2", "CTA"],
    cta: d.cta,
    hypothesis: d.hypothesisTemplate,
    ...(values.experiment ? { experimentId: values.experiment } : {}),
    variantId: values.variant,
  },
  caption: "TODO: caption, max 2200 characters, faithful to what the images show",
  hashtags: ["palermo", "sicilia", "risthome"],
};
let cursor = 0;
if (archetype.formats.reel) {
  const r = archetype.formats.reel;
  spec.reel = {
    hook: { image: imageAt(cursor++), title: "TODO: hook title (max 80 chars)", subtitle: "TODO: subtitle", durationSec: r.hookDurationSec, motion: r.motions[0] },
    scenes: Array.from({ length: r.sceneCount }, (_, i) => ({
      image: imageAt(cursor++),
      label: r.labels?.[i] ?? `TODO label ${i + 1}`,
      text: `TODO: what scene ${i + 1} shows (max 90 chars)`,
      durationSec: r.sceneDurationSec,
      motion: r.motions[(i + 1) % r.motions.length],
    })),
    cta: { title: "TODO: CTA title", line: "TODO: CTA line", durationSec: 3.2 },
    transitionSec: 0.4,
  };
}
if (archetype.formats.carousel) {
  let c = 0;
  spec.carousel = {
    slides: archetype.formats.carousel.slides.map((type) => {
      switch (type) {
        case "cover":
          return { type, image: imageAt(c++), kicker: "TODO", title: "TODO: cover title" };
        case "photo":
          return { type, image: imageAt(c++), title: "TODO: dish name", body: "TODO: one line, faithful to the photo" };
        case "text":
          return { type, title: "TODO: claim", body: "TODO: supporting line" };
        default:
          return { type: "cta", title: "TODO: CTA", body: "Link in bio" };
      }
    }),
  };
}

const result = PostSpec.safeParse(spec);
if (!result.success) {
  console.error("generated spec is invalid:", result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(1);
}
writeFileSync(target, JSON.stringify(spec, null, 2) + "\n");
console.log(`wrote ${target} (${assets.length} assets found${assets.length ? "" : "; run `npm run assets -- " + slug + " --src <dir> --pick <files>` first"})`);
console.log(`next: replace every TODO, then: npm run render -- ${target} --qa`);
