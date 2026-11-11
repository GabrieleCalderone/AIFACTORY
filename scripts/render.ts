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
 *   --strict           treat quality-gate warnings as errors
 *
 * Outputs per post: reel.mp4, carousel-NN.jpg, caption.txt, manifest.json (+ qa/*.png).
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { CAROUSEL, REEL } from "../src/lib/formats.ts";
import { gateSpec } from "../src/lib/gate-io.ts";
import { buildCaption, reelTimeline } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { loadPipeline, setState } from "../src/lib/pipeline-io.ts";

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
    strict: { type: "boolean", default: false },
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

/**
 * Brings the reel's sound to -14 LUFS with peaks under -1 dBTP, the level editors deliver for
 * Instagram and TikTok, so a post is neither quieter nor louder than the ones around it.
 * The picture is copied untouched. On any failure the original file is kept.
 */
const normaliseLoudness = (file: string, slug: string) => {
  const tmp = file.replace(/\.mp4$/, ".loud.mp4");
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], { stdio: ["ignore", "ignore", "pipe"] });
    renameSync(tmp, file);
    log(`${slug}: sound levelled to -14 LUFS`);
  } catch (e) {
    rmSync(tmp, { force: true });
    log(`${slug}: sound left as rendered (${e instanceof Error ? e.message.split("\n")[0] : e})`);
  }
};

const main = async () => {
  const posts = specFiles.map(loadSpec);
  const warningsBySlug = new Map<string, string[]>();
  for (const { spec } of posts) {
    const { errors, warnings } = gateSpec(spec);
    errors.forEach((e) => console.error(`[gate] ${spec.slug}: ERROR ${e}`));
    warnings.forEach((w) => console.warn(`[gate] ${spec.slug}: warning ${w}`));
    if (errors.length > 0 || (values.strict && warnings.length > 0)) {
      throw new Error(`quality gate failed for ${spec.slug}: ${errors.length} errors, ${warnings.length} warnings`);
    }
    warningsBySlug.set(spec.slug, warnings);
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

      if (spec.reel && !values["skip-reel"]) {
        const inputProps = { spec };
        void CAROUSEL;
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
        if (spec.reel.audio) normaliseLoudness(output, spec.slug);
        const timeline = reelTimeline(spec.reel, composition.fps);
        const coverFrame = Math.round(timeline.sequences[0].durationInFrames / 2);
        const cover = path.join(outDir, "reel-cover.jpg");
        await renderStill({ composition, serveUrl, output: cover, frame: coverFrame, inputProps, imageFormat: "jpeg", jpegQuality: 92, scale, puppeteerInstance: browser });
        const reelInfo: Record<string, unknown> = {
          cover,
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
      // A format skipped in this run keeps what an earlier run rendered, as long as its files are still there:
      // otherwise hosting and publishing would silently drop it.
      const manifestPath = path.join(outDir, "manifest.json");
      // Only from a render of this very post (same content hash), and only files that are inside its own folder.
      const earlier = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { spec?: { sha256?: string }; reel?: unknown; carousel?: { file: string }[] }) : {};
      const same = earlier.spec?.sha256 === sha256;
      const inside = (f: string) => path.resolve(f).startsWith(path.resolve(outDir) + path.sep) && existsSync(f);
      if (values["skip-reel"] && earlier.reel) {
        if (same && inside(path.join(outDir, "reel.mp4"))) manifest.reel = earlier.reel;
        else log(`${spec.slug}: the reel was NOT carried over (the post changed since it was rendered): render again without --skip-reel`);
      }
      if (values["skip-carousel"] && earlier.carousel?.length) {
        if (same && earlier.carousel.every((sl) => typeof sl.file === "string" && inside(sl.file))) manifest.carousel = earlier.carousel;
        else log(`${spec.slug}: the carousel was NOT carried over (the post changed since it was rendered): render again without --skip-carousel`);
      }
      manifest.caption = captionFile;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      const st = loadPipeline()[spec.slug]?.state;
      if (st && ["QUALITY_CHECKED", "APPROVED", "RENDERED", "FAILED", "BLOCKED"].includes(st)) setState(spec.slug, "RENDERED", `reel ${manifest.reel ? "yes" : "no"}, slides ${(manifest.carousel as unknown[] | undefined)?.length ?? 0}`);
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
