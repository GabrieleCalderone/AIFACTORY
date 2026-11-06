/** Output formats, shared by the compositions and the CLI (pure TS, no JSX). */
export const REEL = { id: "Reel", width: 1080, height: 1920, fps: 30 } as const;
export const CAROUSEL = { id: "CarouselSlide", width: 1080, height: 1350 } as const;
/** Photo area of a carousel "photo" slide when it carries text. */
export const CAROUSEL_PHOTO_HEIGHT = 840;
