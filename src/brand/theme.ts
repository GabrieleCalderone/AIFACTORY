/** Brand tokens sampled from the RistHome logo (black wordmark, dark-red emblem). */
export const theme = {
  colors: {
    ink: "#0b0b0b",
    accent: "#983038",
    accentDeep: "#6e1f26",
    cream: "#f6f1e8",
    white: "#ffffff",
    scrim: "rgba(8, 8, 8, 0.55)",
  },
  fonts: {
    display: "Playfair Display",
    body: "Inter",
  },
  /** Instagram UI overlays: keep text out of the bottom ~22% and right ~10% of a reel. */
  reelSafe: { top: 220, bottom: 420, left: 72, right: 150 },
  carouselSafe: { x: 84, y: 96 },
  site: "risthome.it",
  handle: "@risthome",
} as const;

export type Theme = typeof theme;
