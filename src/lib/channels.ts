/**
 * Buffer channel map from the environment: BUFFER_CHANNELS="instagram:ID,tiktok:ID,facebook:ID,youtube:ID".
 * BUFFER_CHANNEL_ID alone still works as the Instagram channel. Pure and unit-tested.
 */
export type Platform = "instagram" | "tiktok" | "facebook" | "youtube";
export const PLATFORMS: Platform[] = ["instagram", "tiktok", "facebook", "youtube"];

export const parseChannels = (env: Record<string, string | undefined>): Partial<Record<Platform, string>> => {
  const out: Partial<Record<Platform, string>> = {};
  for (const pair of (env.BUFFER_CHANNELS ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const [platform, id] = pair.split(":").map((s) => s.trim());
    if (!PLATFORMS.includes(platform as Platform)) throw new Error(`BUFFER_CHANNELS entry "${pair}" must be <platform>:<id> with platform in ${PLATFORMS.join("|")}`);
    if (id) out[platform as Platform] = id; // "instagram:" (no id yet) is simply not connected
  }
  if (!out.instagram && env.BUFFER_CHANNEL_ID) out.instagram = env.BUFFER_CHANNEL_ID;
  return out;
};

/** Which platforms receive which asset, and the stagger (hours after the slot) so posts do not land at the same minute everywhere. */
export const distribution: Record<"reel" | "carousel", { platform: Platform; offsetHours: number }[]> = {
  reel: [
    { platform: "instagram", offsetHours: 0 },
    { platform: "tiktok", offsetHours: 1 },
    { platform: "youtube", offsetHours: 2 },
    { platform: "facebook", offsetHours: 3 },
  ],
  carousel: [
    { platform: "instagram", offsetHours: 48 },
    { platform: "facebook", offsetHours: 49 },
  ],
};

/** What a post is made of: real footage, or photographs only. */
export type Material = "video" | "stills";
/** A reel counts as video when at least this many of its pictures are real clips. */
export const MIN_CLIPS_FOR_VIDEO = 3;
export const materialOf = (reel: { hook: { video?: string; image?: string }; scenes: { video?: string; image?: string }[] } | undefined): Material =>
  reel && [reel.hook, ...reel.scenes].filter((m) => m.video).length >= MIN_CLIPS_FOR_VIDEO ? "video" : "stills";

/**
 * The format follows the material. Real footage leads with the reel everywhere. Photographs
 * lead with the carousel (Instagram, TikTok photo post, Facebook); the reel made of framed
 * photographs follows two days later on Instagram only, as a second look at the same work.
 */
export const distributionFor = (material: Material): typeof distribution =>
  material === "video"
    ? distribution
    : {
        carousel: [
          { platform: "instagram", offsetHours: 0 },
          { platform: "tiktok", offsetHours: 1 },
          { platform: "facebook", offsetHours: 2 },
        ],
        reel: [{ platform: "instagram", offsetHours: 48 }],
      };

/** Platform-specific caption: TikTok and Shorts favour a short caption with the tags; Facebook gets the full text without tags. */
export const captionFor = (platform: Platform, full: string, hashtags: string[], hookTitle: string): string => {
  const body = full.split("\n\n").filter((p) => !p.startsWith("#")).join("\n\n");
  switch (platform) {
    case "tiktok":
    case "youtube":
      return [hookTitle, hashtags.slice(0, 5).join(" ")].filter(Boolean).join("\n");
    case "facebook":
      return body;
    default:
      return full;
  }
};
