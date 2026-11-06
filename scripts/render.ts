/**
 * Render posts from content/posts/*.json into out/<slug>/.
 *
 *   node scripts/render.ts content/posts/<slug>.json [more.json] [options]
 *   node scripts/render.ts --all
 *
 * Options:
 *   --scale <n>        render at a fraction of the size (0.5 for quick previews)
 *   --skip-reel        only render carousel slides
 *   --skip-carousel    only render the reel
 *   --qa               also export one PNG frame from the middle of every reel scene
 *   --out <dir>        output root (default: out)
 *   --concurrency <n>  browser tabs used for the reel (default: Remotion's choice)
 *   --crf <n>          H.264 quality, lower is better (default 18)
 *
 * Outputs per post: reel.mp4, carousel-NN.jpg, caption.txt, manifest.json (+ qa/*.png).
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { CAROUSEL, CAROUSEL_PHOTO_HEIGHT, REEL } from "../src/lib/formats.ts";
import { buildCaption, reelTimeline } from "../src/lib/timeline.ts";
import { parsePostSpec, type PostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: "boolean", default: false },
    scale: { type: "string", default: "1" },
    "skip-reel": { type: "boolean", default: false },
    "skip-carousel": { type: "boolean", default: false },
    qa: { type: "boolean", default: false },
    out: { type: "string", default: "out" },
    concurrency: { type: "string" },
    crf: { type: "string", default: "18" },
  },
});

const scale = Number(values.scale);
const crf = Number(values.crf);
if (!(scale > 0 && scale <= 1) || !Number.isInteger(crf)) {
  console.error("--scale must be in (0, 1] and --crf an integer");
  process.exit(2);
}
const concurrency = values.concurrency ? Number(values.concurrency) : null;

const specFiles = values.all
  ? readdirSync("content/posts")
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => path.join("content/posts", f))
  : positionals;

if (specFiles.length === 0) {
  console.error("usage: node scripts/render.ts content/posts/<slug>.json [--all] [--scale 0.5] [--qa]");
  process.exit(2);
}

type AssetInfo = { file: string; width: number; height: number };

const readAssetDims = (image: string): AssetInfo | null => {
  const manifest = path.join("public", path.dirname(image), "manifest.json");
  if (!existsSync(manifest)) return null;
  const rows = JSON.parse(readFileSync(manifest, "utf8")) as AssetInfo[];
  return rows.find((r) => r.file === path.basename(image)) ?? null;
};

const imagesOf = (spec: PostSpec): string[] => {
  const set = new Set<string>();
  if (spec.reel) {
    set.add(spec.reel.hook.image);
    spec.reel.scenes.forEach((s) => set.add(s.image));
  }
  if (spec.carousel) {
    spec.carousel.slides.forEach((s) => {
      if ("image" in s && s.image) set.add(s.image);
    });
  }
  return [...set];
};

/** Quality gate: fail on missing files, warn when a photo would be upscaled more than 2x. */
const checkAssets = (spec: PostSpec): string[] => {
  const warnings: string[] = [];
  const missing = imagesOf(spec).filter((img) => !existsSync(path.join("public", img)));
  if (missing.length > 0) {
    throw new Error(`post "${spec.slug}": missing images under public/: ${missing.join(", ")}`);
  }
  const check = (image: string, w: number, h: number, where: string) => {
    const dims = readAssetDims(image);
    if (!dims) return;
    const factor = Math.max(w / dims.width, h / dims.height);
    if (factor > 2) {
      warnings.push(`${where}: ${image} is ${dims.width}x${dims.height}, upscaled ${factor.toFixed(1)}x to fill ${w}x${h}`);
    }
  };
  if (spec.reel) {
    check(spec.reel.hook.image, REEL.width, REEL.height, "reel hook");
    spec.reel.scenes.forEach((s, i) => check(s.image, REEL.width, REEL.height, `reel scene ${i + 1}`));
  }
  if (spec.carousel) {
    spec.carousel.slides.forEach((s, i) => {
      if (s.type === "cover" || (s.type === "cta" && s.image)) check(s.image!, CAROUSEL.width, CAROUSEL.height, `carousel slide ${i + 1}`);
      if (s.type === "photo") check(s.image, CAROUSEL.width, s.title || s.body ? CAROUSEL_PHOTO_HEIGHT : CAROUSEL.height, `carousel slide ${i + 1}`);
    });
  }
  return warnings;
};

const ffprobe = (file: string): Record<string, unknown> | null => {
  try {
    const json = execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt:format=duration,size", "-of", "json", file],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(json) as { streams?: Record<string, unknown>[]; format?: Record<string, unknown> };
    return { ...(parsed.streams?.[0] ?? {}), ...(parsed.format ?? {}) };
  } catch {
    return null;
  }
};

const loadSpec = (file: string) => {
  const raw = readFileSync(file, "utf8");
  const spec = parsePostSpec(JSON.parse(raw));
  return { file, spec, sha256: createHash("sha256").update(raw).digest("hex") };
};

const log = (msg: string) => console.log(`[render] ${msg}`);

const main = async () => {
  const posts = specFiles.map(loadSpec);
  const warningsBySlug = new Map<string, string[]>();
  for (const { spec } of posts) {
    warningsBySlug.set(spec.slug, checkAssets(spec));
  }

  log(`bundling src/index.ts`);
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    publicDir: path.resolve("public"),
    onProgress: (p) => {
      if (p % 25 === 0) log(`bundle ${p}%`);
    },
  });
  const browser = await openBrowser("chrome");
  try {
    for (const { file, spec, sha256 } of posts) {
      const outDir = path.join(values.out, spec.slug);
      mkdirSync(outDir, { recursive: true });
      const manifest: Record<string, unknown> = {
        slug: spec.slug,
        title: spec.title,
        lang: spec.lang,
        renderedAt: new Date().toISOString(),
        spec: { file, sha256 },
        experiment: { id: spec.brief.experimentId ?? null, variant: spec.brief.variantId ?? null, archetype: spec.brief.archetype },
        scale,
        warnings: warningsBySlug.get(spec.slug) ?? [],
      };
      for (const w of warningsBySlug.get(spec.slug) ?? []) log(`warning: ${w}`);

      if (spec.reel && !values["skip-reel"]) {
        const inputProps = { spec };
        const composition = await selectComposition({ serveUrl, id: REEL.id, inputProps, puppeteerInstance: browser });
        const output = path.join(outDir, "reel.mp4");
        log(`${spec.slug}: reel ${composition.durationInFrames} frames @ ${composition.fps}fps -> ${output}`);
        let lastPct = -1;
        await renderMedia({
          composition,
          serveUrl,
          codec: "h264",
          crf,
          scale,
          concurrency,
          inputProps,
          outputLocation: output,
          puppeteerInstance: browser,
          onProgress: ({ progress }) => {
            const pct = Math.floor(progress * 10) * 10;
            if (pct !== lastPct) {
              lastPct = pct;
              log(`${spec.slug}: reel ${pct}%`);
            }
          },
        });
        const timeline = reelTimeline(spec.reel, composition.fps);
        const reelInfo: Record<string, unknown> = {
          file: output,
          durationInFrames: composition.durationInFrames,
          durationSec: composition.durationInFrames / composition.fps,
          fps: composition.fps,
          width: Math.round(composition.width * scale),
          height: Math.round(composition.height * scale),
          scenes: timeline.sequences,
          probe: ffprobe(output),
        };
        if (values.qa) {
          const qaDir = path.join(outDir, "qa");
          mkdirSync(qaDir, { recursive: true });
          let from = 0;
          const frames: { name: string; frame: number; file: string }[] = [];
          timeline.sequences.forEach((seq, i) => {
            const frame = Math.min(composition.durationInFrames - 1, Math.round(from + seq.durationInFrames / 2));
            frames.push({ name: seq.name, frame, file: path.join(qaDir, `reel-${String(i + 1).padStart(2, "0")}-${seq.name.toLowerCase().replace(/\s+/g, "-")}-f${frame}.png`) });
            from += seq.durationInFrames - timeline.transitionInFrames;
          });
          for (const f of frames) {
            await renderStill({ composition, serveUrl, output: f.file, frame: f.frame, inputProps, imageFormat: "png", scale, puppeteerInstance: browser });
          }
          reelInfo.qaFrames = frames;
          log(`${spec.slug}: ${frames.length} QA frames -> ${qaDir}`);
        }
        manifest.reel = reelInfo;
      }

      if (spec.carousel && !values["skip-carousel"]) {
        const slides: Record<string, unknown>[] = [];
        for (let i = 0; i < spec.carousel.slides.length; i++) {
          const inputProps = { spec, slideIndex: i };
          const composition = await selectComposition({ serveUrl, id: CAROUSEL.id, inputProps, puppeteerInstance: browser });
          const output = path.join(outDir, `carousel-${String(i + 1).padStart(2, "0")}.jpg`);
          await renderStill({ composition, serveUrl, output, inputProps, imageFormat: "jpeg", jpegQuality: 92, scale, puppeteerInstance: browser });
          slides.push({ index: i + 1, type: spec.carousel.slides[i].type, file: output, width: Math.round(composition.width * scale), height: Math.round(composition.height * scale) });
        }
        log(`${spec.slug}: ${slides.length} carousel slides -> ${outDir}`);
        manifest.carousel = slides;
      }

      const captionFile = path.join(outDir, "caption.txt");
      writeFileSync(captionFile, buildCaption(spec) + "\n");
      manifest.caption = captionFile;
      writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
      log(`${spec.slug}: done -> ${outDir}/manifest.json`);
    }
  } finally {
    await browser.close({ silent: true });
  }
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
