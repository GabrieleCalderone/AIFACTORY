import { CAROUSEL, CAROUSEL_PHOTO_HEIGHT, REEL } from "./formats.ts";
import { reelTimeline } from "./timeline.ts";
import type { PostSpec } from "../schemas/post.ts";

/**
 * Pre-render quality gate. Pure: file system and data lookups are injected so the
 * rules can be unit-tested. Errors block a render; warnings are reported (and block
 * with --strict).
 */
export type MediaInfo = { width: number; height: number; people?: string; durationSec?: number } | null;

export type GateInput = {
  spec: PostSpec;
  exists: (publicPath: string) => boolean;
  info: (publicPath: string) => MediaInfo;
  archetypeIds: string[];
  experimentRows: { experiment_id: string; variant_id: string }[];
};

export type GateResult = { errors: string[]; warnings: string[] };

export const mediaOf = (spec: PostSpec): { images: string[]; videos: string[] } => {
  const images = new Set<string>();
  const videos = new Set<string>();
  const add = (m: { image?: string; video?: string }) => {
    if (m.image) images.add(m.image);
    if (m.video) videos.add(m.video);
  };
  if (spec.reel) {
    add(spec.reel.hook);
    spec.reel.scenes.forEach(add);
  }
  spec.carousel?.slides.forEach((s) => {
    if ("image" in s && s.image) images.add(s.image);
  });
  return { images: [...images], videos: [...videos] };
};

const findTodos = (value: unknown, path: string, out: string[]) => {
  if (typeof value === "string") {
    if (/\bTODO\b/.test(value)) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findTodos(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => findTodos(v, path ? `${path}.${k}` : k, out));
  }
};

export const runGate = ({ spec, exists, info, archetypeIds, experimentRows }: GateInput): GateResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const todos: string[] = [];
  findTodos(spec, "", todos);
  todos.forEach((p) => errors.push(`unfinished text (TODO) at ${p}`));

  if (!archetypeIds.includes(spec.brief.archetype)) errors.push(`unknown archetype ${spec.brief.archetype}`);

  const { images, videos } = mediaOf(spec);
  [...images, ...videos].filter((m) => !exists(m)).forEach((m) => errors.push(`missing media under public/: ${m}`));

  if (spec.reel) {
    try {
      reelTimeline(spec.reel, REEL.fps);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const checkFit = (media: string, w: number, h: number, where: string) => {
    const d = info(media);
    if (!d) {
      warnings.push(`${where}: no manifest entry for ${media}; size and consent unknown`);
      return;
    }
    const factor = Math.max(w / d.width, h / d.height);
    if (factor > 2) warnings.push(`${where}: ${media} is ${d.width}x${d.height}, upscaled ${factor.toFixed(1)}x to fill ${w}x${h}`);
    if (d.people === undefined) warnings.push(`${where}: consent not recorded for ${media} (prepare_assets --people)`);
    else if (!["none", "chef", "guests-consented"].includes(d.people)) errors.push(`${where}: ${media} shows people without recorded consent (${d.people})`);
  };
  if (spec.reel) {
    const hookMedia = spec.reel.hook.video ?? spec.reel.hook.image ?? "";
    checkFit(hookMedia, REEL.width, REEL.height, "reel hook");
    spec.reel.scenes.forEach((s, i) => checkFit(s.video ?? s.image ?? "", REEL.width, REEL.height, `reel scene ${i + 1}`));
  }
  spec.carousel?.slides.forEach((s, i) => {
    if (s.type === "cover" || (s.type === "cta" && s.image)) checkFit(s.image as string, CAROUSEL.width, CAROUSEL.height, `carousel slide ${i + 1}`);
    if (s.type === "photo") checkFit(s.image, CAROUSEL.width, s.title || s.body ? CAROUSEL_PHOTO_HEIGHT : CAROUSEL.height, `carousel slide ${i + 1}`);
  });

  if (spec.brief.experimentId) {
    const row = experimentRows.find((r) => r.experiment_id === spec.brief.experimentId && r.variant_id === (spec.brief.variantId ?? "A"));
    if (!row) warnings.push(`no row in data/experiments.csv for ${spec.brief.experimentId}/${spec.brief.variantId ?? "A"}; add it before publishing`);
  } else {
    warnings.push("brief.experimentId not set: this post will not be tracked");
  }
  return { errors, warnings };
};
