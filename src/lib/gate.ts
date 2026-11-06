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

/** Allowed hosts inside published text. Anything else (and any path or secret-looking token) is an error. */
const ALLOWED_URL_HOSTS = ["risthome.it", "www.risthome.it", "incompetech.com"];
const SECRET_PATTERNS: [RegExp, string][] = [
  [/https?:\/\/[^\s)]+/gi, "url"],
  [/(?:^|[\s(])\/(?:Users|home|etc|var|private|tmp)\/[^\s)]*/g, "absolute path"],
  [/\b(?:sk|rk|pk)[-_](?:live|test)?[-_]?[A-Za-z0-9]{12,}/g, "api key"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "aws key"],
  [/-----BEGIN [A-Z ]+PRIVATE KEY-----/g, "private key"],
  [/\bgh[opsu]_[A-Za-z0-9]{20,}\b/g, "github token"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}\b/gi, "email"],
  [/(?:\+|\b00)\d[\d .-]{7,}\d|\b\d{3}[ .-]\d{3}[ .-]\d{4}\b|\b\d{3}[ .-]\d{7}\b/g, "phone number"],
  [/BUFFER_API_KEY|HF_API_KEY|API_KEY=|SECRET=/g, "env variable"],
];

/** Scan every string of a spec; returns one message per hit (field path + kind). */
export const scanTexts = (value: unknown, path = ""): string[] => {
  const hits: string[] = [];
  if (typeof value === "string") {
    for (const [re, kind] of SECRET_PATTERNS) {
      for (const m of value.matchAll(re)) {
        const text = m[0];
        if (kind === "url") {
          const host = text.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
          if (ALLOWED_URL_HOSTS.includes(host)) continue;
        }
        hits.push(`${path || "text"}: ${kind} "${text.slice(0, 40)}"`);
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...scanTexts(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) hits.push(...scanTexts(v, path ? `${path}.${k}` : k));
  }
  return hits;
};

export const runGate = ({ spec, exists, info, archetypeIds, experimentRows }: GateInput): GateResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only what reaches Instagram is scanned: caption, hashtags, on-screen texts, music credit.
  const published = {
    caption: spec.caption,
    hashtags: spec.hashtags,
    reel: spec.reel
      ? { hook: { title: spec.reel.hook.title, subtitle: spec.reel.hook.subtitle }, scenes: spec.reel.scenes.map((s) => ({ label: s.label, text: s.text })), cta: spec.reel.cta, audio: spec.reel.audio?.attribution }
      : undefined,
    carousel: spec.carousel?.slides.map((s) => ({ title: "title" in s ? s.title : undefined, body: "body" in s ? s.body : undefined, kicker: "kicker" in s ? s.kicker : undefined })),
  };
  scanTexts(published).forEach((h) => errors.push(`published text must not contain ${h}`));

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
    if (!spec.reel.audio) {
      warnings.push("reel has no audio track: Instagram says muted reels are made less visible; add a licensed track in the app when posting, or set reel.audio");
    }
  }

  const checkFit = (media: string, w: number, h: number, where: string) => {
    const d = info(media);
    if (!d) {
      errors.push(`${where}: no manifest entry for ${media}; prepare it with prepare_assets/prepare_clips so size and consent are recorded`);
      return;
    }
    const factor = Math.max(w / d.width, h / d.height);
    if (factor > 2) warnings.push(`${where}: ${media} is ${d.width}x${d.height}, upscaled ${factor.toFixed(1)}x to fill ${w}x${h}`);
    if (d.people === undefined) errors.push(`${where}: consent not recorded for ${media} (re-run prepare_assets --people none|chef|guests-consented)`);
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
