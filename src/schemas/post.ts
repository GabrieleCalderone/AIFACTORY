import { z } from "zod";

/**
 * Content spec for one Instagram post produced by the factory.
 * One JSON file in content/posts/<slug>.json = one post (reel and/or carousel + caption).
 * Image paths are relative to public/ (e.g. "assets/<slug>/01-photo.jpg").
 */

/** Relative path under public/: no leading slash, no "." or ".." segments, safe characters only. */
const relativeUnderPublic = /^(?!\/)(?!(?:.*\/)?\.\.?(?:\/|$))[\w][\w./-]*$/;
const imagePath = z
  .string()
  .min(1)
  .regex(relativeUnderPublic, "image must be a relative path under public/ without ../ segments")
  .regex(/\.(jpe?g|png|webp)$/i, "image must end in jpg/png/webp");

const videoPath = z
  .string()
  .min(1)
  .regex(relativeUnderPublic, "video must be a relative path under public/ without ../ segments")
  .regex(/\.(mp4|mov|webm)$/i, "video must end in mp4/mov/webm");

/** A scene shows either a still photo (with a camera move) or a real clip (looped, muted). */
const media = {
  image: imagePath.optional(),
  video: videoPath.optional(),
  /** seconds to skip at the start of the clip */
  trimSec: z.number().min(0).max(600).default(0),
};
const oneMedia = { message: "exactly one of image or video is required" };
const hasOneMedia = (m: { image?: string; video?: string }) => (m.image ? 1 : 0) + (m.video ? 1 : 0) === 1;

export const Lang = z.enum(["it", "en"]);

/**
 * Camera moves applied to a still photo. The last four are local re-creations of
 * Higgsfield "Camera Controls" presets (Dolly In, Crash Zoom In, Arc Left/Right)
 * so a brief can name the move without depending on an external service.
 */
export const ReelMotion = z.enum([
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "dolly-in",
  "crash-zoom-in",
  "arc-left",
  "arc-right",
]);

export const ReelHook = z
  .object({
    ...media,
    title: z.string().min(3).max(80),
    subtitle: z.string().max(80).optional(),
    durationSec: z.number().min(2).max(6).default(3.2),
    motion: ReelMotion.default("zoom-in"),
  })
  .refine(hasOneMedia, oneMedia);

export const ReelScene = z
  .object({
    ...media,
    text: z.string().max(90).optional(),
    label: z.string().max(30).optional(),
    durationSec: z.number().min(1.5).max(8).default(2.8),
    motion: ReelMotion.default("zoom-in"),
  })
  .refine(hasOneMedia, oneMedia);

export const ReelCta = z.object({
  title: z.string().min(2).max(60),
  line: z.string().max(80).optional(),
  durationSec: z.number().min(2).max(6).default(3),
});

export const ReelAudio = z.object({
  /** Path under public/. Only use tracks you are licensed to publish. */
  src: z.string().min(1).regex(relativeUnderPublic, "audio must be a relative path under public/"),
  volume: z.number().min(0).max(1).default(0.8),
  fadeOutSec: z.number().min(0).max(5).default(1),
  /** Licence credit appended to the caption, e.g. '"Fretless" Kevin MacLeod (incompetech.com), CC BY 4.0'. */
  attribution: z.string().max(200).optional(),
});

export const Reel = z.object({
  hook: ReelHook,
  scenes: z.array(ReelScene).min(1).max(12),
  cta: ReelCta,
  transitionSec: z.number().min(0).max(1).default(0.4),
  audio: ReelAudio.optional(),
});

export const CarouselSlide = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cover"),
    image: imagePath,
    title: z.string().min(3).max(90),
    kicker: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("photo"),
    image: imagePath,
    title: z.string().max(70).optional(),
    body: z.string().max(220).optional(),
  }),
  z.object({
    type: z.literal("text"),
    title: z.string().min(2).max(90),
    body: z.string().max(320).optional(),
  }),
  z.object({
    type: z.literal("cta"),
    title: z.string().min(2).max(70),
    body: z.string().max(120).optional(),
    image: imagePath.optional(),
  }),
]);

export const Carousel = z.object({
  slides: z.array(CarouselSlide).min(2).max(20),
});

const hashtag = z
  .string()
  .trim()
  .regex(/^#?[\p{L}\p{N}_]+$/u, "hashtag may only contain letters, numbers and underscores")
  .transform((s) => `#${s.replace(/^#/, "").toLowerCase()}`);

/**
 * Strategy layer, written before any rendering: who, why, how the first second
 * earns attention, the beat sequence, the ask, and the hypothesis the variant tests.
 */
export const Brief = z.object({
  archetype: z.string().regex(/^A[1-5]-[a-z-]+$/, "archetype id like A1-process-reveal"),
  audience: z.string().min(3).max(300),
  objective: z.string().min(3).max(300),
  hook: z.string().min(3).max(200),
  sequence: z.array(z.string().min(1).max(160)).min(1).max(14),
  cta: z.string().min(2).max(200),
  hypothesis: z.string().max(400).optional(),
  experimentId: z.string().regex(/^EXP-\d{3,}$/).optional(),
  variantId: z.string().regex(/^[A-Z][A-Za-z0-9-]*$/).optional(),
});

export const PostSpec = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
    lang: Lang,
    title: z.string().min(1).max(120),
    /** Instagram caption, max 2200 characters. Hashtags are appended by the renderer. */
    brief: Brief,
    caption: z.string().min(1).max(2200),
    hashtags: z
      .array(hashtag)
      .max(30)
      .default([])
      .transform((tags) => Array.from(new Set(tags))),
    reel: Reel.optional(),
    carousel: Carousel.optional(),
  })
  .refine((p) => p.reel !== undefined || p.carousel !== undefined, {
    message: "a post needs a reel, a carousel, or both",
  });

export type PostSpec = z.infer<typeof PostSpec>;
export type PostSpecInput = z.input<typeof PostSpec>;
export type Brief = z.infer<typeof Brief>;
export type Reel = z.infer<typeof Reel>;
export type ReelScene = z.infer<typeof ReelScene>;
export type ReelMotion = z.infer<typeof ReelMotion>;
export type Carousel = z.infer<typeof Carousel>;
export type CarouselSlide = z.infer<typeof CarouselSlide>;

export const parsePostSpec = (input: unknown): PostSpec => PostSpec.parse(input);
