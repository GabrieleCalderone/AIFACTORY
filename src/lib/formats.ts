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
