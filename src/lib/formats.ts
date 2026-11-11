/** Output formats, shared by the compositions and the CLI (pure TS, no JSX). */
export const REEL = { id: "Reel", width: 1080, height: 1920, fps: 30 } as const;
export const CAROUSEL = { id: "CarouselSlide", width: 1080, height: 1350 } as const;
/** Photo area of a carousel "photo" slide when it carries text (layout before the mat; kept for old renders). */
export const CAROUSEL_PHOTO_HEIGHT = 840;
/**
 * The mat: every carousel photograph sits whole inside this box on the cream ground, with
 * the same margins on every slide, its words below and the house mark at the foot. Nothing
 * is cropped or blown up, and all that matters stays inside the centre square that the
 * profile grid shows. A cover that is too small to fill the slide uses the shorter box.
 */
export const CAROUSEL_MAT = { left: 84, top: 140, width: 912, height: 780, coverHeight: 700 } as const;

/** A detail is cut from the photograph itself, so it is held to a stricter limit than a whole picture. */
export const DETAIL_ABOVE = 1.25;
/** A detail shows at most this share of the picture's width or height: more than that is the same picture again. */
export const DETAIL_MAX_SHARE = 0.7;
export type Region = { x: number; y: number; w: number; h: number };
/**
 * The part of a w x h photograph shown by a "detail" slide, as fractions of the picture: a
 * box with the mat's proportions around the point (cx, cy), half the picture across where
 * the photograph is large enough, never enlarged more than DETAIL_ABOVE, moved inward where
 * the point is near an edge. Null when the photograph is too small to give a true detail.
 */
export const detailRegion = (w: number, h: number, cx: number, cy: number): Region | null => {
  if (!(w > 0 && h > 0) || ![cx, cy].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) return null;
  const aspect = CAROUSEL_MAT.width / CAROUSEL_MAT.height;
  const widest = Math.min(w, h * aspect);
  const across = Math.max(CAROUSEL_MAT.width / DETAIL_ABOVE, widest * 0.5);
  if (across > widest * DETAIL_MAX_SHARE) return null;
  const rw = across / w;
  const rh = across / aspect / h;
  const clamp = (centre: number, size: number) => Math.min(1 - size, Math.max(0, centre - size / 2));
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  return { x: round(clamp(cx, rw)), y: round(clamp(cy, rh)), w: round(rw), h: round(rh) };
};
/** Why a stored region cannot be shown as a detail of a w x h photograph, or null when it can. */
export const detailProblem = (w: number, h: number, r: Region): string | null => {
  if (r.x < 0 || r.y < 0 || r.x + r.w > 1.0001 || r.y + r.h > 1.0001) return "the detail reaches outside the photograph";
  const [pw, ph] = [r.w * w, r.h * h];
  if (Math.abs(pw / ph - CAROUSEL_MAT.width / CAROUSEL_MAT.height) > 0.02) return "the detail does not have the proportions of the mat";
  if (CAROUSEL_MAT.width / pw > DETAIL_ABOVE + 0.01) return `the detail is enlarged ${(CAROUSEL_MAT.width / pw).toFixed(2)}x (limit ${DETAIL_ABOVE}x)`;
  if (Math.max(r.w, r.h) > 0.86) return "the detail shows almost the whole photograph";
  return null;
};

/**
 * "Plate" presentation of a reel photo: the picture sits whole inside this box on the dark
 * ground, like a plate on the pass, instead of being blown up to fill the frame. Used for
 * photos too small to fill 1080x1920 without going soft. The hook keeps a shorter box so
 * its title has room.
 */
export const REEL_PLATE = { left: 90, top: 300, width: 900, height: 960, hookHeight: 720 } as const;
/** Enlargement needed to fill the whole reel frame above which a photo is shown as a plate. */
export const PLATE_ABOVE = 1.5;

export type ReelFrame = "full" | "plate";
/** Enlargement needed for a w x h picture to cover a W x H area (cropping the overflow). */
export const fillFactor = (w: number, h: number, W: number, H: number): number => Math.max(W / w, H / h);
/** Enlargement needed for a w x h picture to fit inside a W x H box without cropping. */
export const fitFactor = (w: number, h: number, W: number, H: number): number => Math.min(W / w, H / h);
export const reelFrameFor = (w: number, h: number): ReelFrame => (fillFactor(w, h, REEL.width, REEL.height) > PLATE_ABOVE ? "plate" : "full");

/** A cover fills the slide only when the photo is large enough; otherwise it is matted like the others. */
export const coverFrameFor = (w: number, h: number): ReelFrame => (fillFactor(w, h, CAROUSEL.width, CAROUSEL.height) > PLATE_ABOVE ? "plate" : "full");

type FramedMedia = { image?: string; frame?: ReelFrame };
/**
 * Chooses the presentation of every reel photo from its real size, on the raw spec object.
 * One small photo turns the whole reel into plates: a reel keeps a single way of showing
 * pictures. Returns the paths set to "plate". Clips and photos of unknown size are left alone.
 */
export const applyReelFrames = (reel: { hook: FramedMedia; scenes: FramedMedia[] }, sizeOf: (image: string) => { width: number; height: number } | null): string[] => {
  const known: { m: FramedMedia; where: string; frame: ReelFrame }[] = [];
  const look = (m: FramedMedia, where: string) => {
    const size = m.image ? sizeOf(m.image) : null;
    if (size) known.push({ m, where, frame: reelFrameFor(size.width, size.height) });
  };
  look(reel.hook, "reel.hook");
  reel.scenes.forEach((s, i) => look(s, `reel.scenes.${i}`));
  const anyPlate = known.some((k) => k.frame === "plate");
  for (const k of known) k.m.frame = anyPlate ? "plate" : "full";
  return anyPlate ? known.map((k) => k.where) : [];
};

/** At most this many closer looks in one carousel: a detail is an accent, not a way to fill slides. */
export const MAX_DETAILS = 1;
type RawSlide = { type?: unknown; image?: unknown; detail?: unknown };
/**
 * Turns the author's `"detail": true` into the part of the photograph to show, on the raw
 * slides. A detail is kept only where the slide before shows the same photograph whole, a
 * point is recorded for it and the photograph is large enough; any other is removed, which
 * leaves a plain repeat for the caller to refuse. Returns the indexes kept.
 */
export const applyDetails = (slides: RawSlide[], pointOf: (image: string) => { x: number; y: number } | null, sizeOf: (image: string) => { width: number; height: number } | null): number[] => {
  const kept: number[] = [];
  slides.forEach((slide, i) => {
    if (slide.detail === undefined) return;
    const before = slides[i - 1];
    const image = typeof slide.image === "string" ? slide.image : "";
    const whole = Boolean(before) && (before.type === "cover" || (before.type === "photo" && before.detail === undefined)) && before.image === image;
    const [point, size] = [image ? pointOf(image) : null, image ? sizeOf(image) : null];
    const region = slide.type === "photo" && slide.detail === true && whole && point && size && kept.length < MAX_DETAILS ? detailRegion(size.width, size.height, point.x, point.y) : null;
    if (region) {
      slide.detail = region;
      kept.push(i);
    } else delete slide.detail;
  });
  return kept;
};
