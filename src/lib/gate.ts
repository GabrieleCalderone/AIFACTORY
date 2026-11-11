import { CAROUSEL, CAROUSEL_MAT, REEL, REEL_PLATE, detailProblem, fillFactor, fitFactor } from "./formats.ts";
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

/** Photographs shown more than once within the reel or within the carousel. A detail of the slide before is not a repeat. */
export const repeatedImages = (spec: PostSpec): string[] => {
  const repeats = new Set<string>();
  const scan = (images: (string | undefined)[]) => {
    const seen = new Set<string>();
    for (const image of images) {
      if (!image) continue;
      if (seen.has(image)) repeats.add(image);
      seen.add(image);
    }
  };
  if (spec.reel) scan([spec.reel.hook.image, ...spec.reel.scenes.map((s) => s.image)]);
  if (spec.carousel) scan(spec.carousel.slides.map((s) => ("image" in s && !(s.type === "photo" && s.detail) ? s.image : undefined)));
  return [...repeats];
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
  // Money, percentages and offer words in any inflection; prices never belong in published text.
  [/(?:€|\$|£)\s?\d|\d{1,4}(?:[.,]\d{1,2})?\s*(?:€|eur\b|euro[si]?\b|usd\b|gbp\b|dollar\w*)/gi, "price or offer claim"],
  [/\d{1,3}\s?(?:%|per\s?cent\w*)/gi, "price or offer claim"],
  [/\b(?:prezz\w*|price[sd]?|offert\w*|offer(?:s|ed|ing)?|promo\w*|scont\w*|discount\w*|gratis|gratuit\w*|free\s+cancellation|garant\w*|guarante\w*|deal|coupon|voucher)\b/gi, "price or offer claim"],
  // Any domain-shaped token; the single allow-list below decides.
  [/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi, "bare domain"],
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
        if (kind === "bare domain") {
          const host = text.toLowerCase().replace(/^www\./, "");
          const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
          if (!ipv4 && /^\d+(?:[.,]\d+)*$/.test(host)) continue; // a plain number such as 5.0 or 1.234,56
          if (!ipv4 && !/\.[a-z]{2,}$/.test(host)) continue; // not a domain-shaped token
          if (ALLOWED_URL_HOSTS.some((h) => host === h.replace(/^www\./, ""))) continue;
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
    credits: spec.credits,
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

  const checkFit = (media: string, w: number, h: number, where: string, contain = false) => {
    const d = info(media);
    if (!d) {
      errors.push(`${where}: no manifest entry for ${media}; prepare it with prepare_assets/prepare_clips so size and consent are recorded`);
      return;
    }
    // A plate is fitted whole inside its box; everything else is cropped to cover its area.
    const factor = contain ? fitFactor(d.width, d.height, w, h) : fillFactor(d.width, d.height, w, h);
    if (factor > 2) warnings.push(`${where}: ${media} is ${d.width}x${d.height}, upscaled ${factor.toFixed(1)}x to ${contain ? "fit" : "fill"} ${w}x${h}`);
    if (d.people === undefined) errors.push(`${where}: consent not recorded for ${media} (re-run prepare_assets --people none|chef|guests-consented)`);
    else if (!["none", "chef", "guests-consented"].includes(d.people)) errors.push(`${where}: ${media} shows people without recorded consent (${d.people})`);
  };
  if (spec.reel) {
    const hookMedia = spec.reel.hook.video ?? spec.reel.hook.image ?? "";
    const plate = (m: { frame?: string; image?: string }) => m.frame === "plate" && Boolean(m.image);
    if (plate(spec.reel.hook)) checkFit(hookMedia, REEL_PLATE.width, REEL_PLATE.hookHeight, "reel hook", true);
    else checkFit(hookMedia, REEL.width, REEL.height, "reel hook");
    spec.reel.scenes.forEach((s, i) => {
      if (plate(s)) checkFit(s.image ?? "", REEL_PLATE.width, REEL_PLATE.height, `reel scene ${i + 1}`, true);
      else checkFit(s.video ?? s.image ?? "", REEL.width, REEL.height, `reel scene ${i + 1}`);
    });
  }
  spec.carousel?.slides.forEach((s, i) => {
    if (s.type === "cover" && s.frame === "plate") checkFit(s.image, CAROUSEL_MAT.width, CAROUSEL_MAT.coverHeight, `carousel slide ${i + 1}`, true);
    else if (s.type === "cover" || (s.type === "cta" && s.image)) checkFit(s.image as string, CAROUSEL.width, CAROUSEL.height, `carousel slide ${i + 1}`);
    // Photo slides are always matted: the picture is fitted whole inside the mat.
    // A photo slide is matted (fitted whole) unless it was set to fill the slide like the cover.
    if (s.type === "photo" && s.frame === "full" && !s.detail) checkFit(s.image, CAROUSEL.width, CAROUSEL.height, `carousel slide ${i + 1}`);
    else if (s.type === "photo") checkFit(s.image, CAROUSEL_MAT.width, CAROUSEL_MAT.height, `carousel slide ${i + 1}`, true);    // A detail is a closer look at the picture the reader has just seen whole; it never stands alone.
    if (s.type === "photo" && s.detail) {
      const before = spec.carousel!.slides[i - 1];
      const whole = before && (before.type === "cover" || (before.type === "photo" && !before.detail)) && before.image === s.image;
      if (!whole) errors.push(`carousel slide ${i + 1}: a detail must follow the slide that shows the same photograph whole`);
      const d = info(s.image);
      const problem = d ? detailProblem(d.width, d.height, s.detail) : null;
      if (problem) errors.push(`carousel slide ${i + 1}: ${problem}`);
    }
  });

  if (spec.brief.experimentId) {
    const row = experimentRows.find((r) => r.experiment_id === spec.brief.experimentId && r.variant_id === (spec.brief.variantId ?? "A"));
    if (!row) warnings.push(`no row in data/experiments.csv for ${spec.brief.experimentId}/${spec.brief.variantId ?? "A"}; add it before publishing`);
  } else {
    warnings.push("brief.experimentId not set: this post will not be tracked");
  }
  return { errors, warnings };
};

/** A photograph of the house needs at least this mark for fit with a starred house to open or to close a piece. */
export const LEAD_MIN_FIT = 60;
/**
 * The first and the last photograph carry a piece: a weak one is never put there, even when
 * it is the only table or the only dessert available (close on a better dish instead).
 * Licensed context pictures are judged when they are approved, not here; a photograph the
 * catalogue does not know is not refused on that ground.
 */
export const weakLeads = (spec: PostSpec, fitOf: (image: string) => number | undefined, min = LEAD_MIN_FIT): string[] => {
  const issues: string[] = [];
  const judge = (image: string | undefined, where: string) => {
    const fit = image ? fitOf(image) : undefined;
    if (image && fit !== undefined && fit < min) issues.push(`${where}: ${image} is too weak to carry the piece (fit ${fit}, at least ${min})`);
  };
  if (spec.carousel) {
    const pictures = spec.carousel.slides.filter((s): s is Extract<typeof s, { image: string }> => "image" in s && typeof s.image === "string" && s.type !== "cta");
    judge(pictures[0]?.image, "carousel cover");
    if (pictures.length > 1) judge(pictures[pictures.length - 1].image, "carousel closing photograph");
  }
  if (spec.reel) {
    judge(spec.reel.hook.image, "reel hook");
    judge(spec.reel.scenes[spec.reel.scenes.length - 1]?.image, "reel closing scene");
  }
  return issues;
};
