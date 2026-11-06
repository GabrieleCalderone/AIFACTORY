import { z } from "zod";

/** One row of data/references.csv: a permitted public creative reference, recorded by hand. */
const optInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int().nonnegative().nullable(),
);
const optNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().nonnegative().nullable(),
);
const optText = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable());

export const ReferenceRow = z.object({
  reference_id: z.string().regex(/^REF-\d{3,}$/),
  collected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  collection_method: z.enum(["manual", "platform_export", "official_api"]),
  permission_basis: z.enum(["public_post_viewed_manually", "own_account_export", "creator_consent", "tiktok_creative_center"]),
  source_platform: z.enum(["instagram", "tiktok", "youtube", "facebook", "other"]),
  source_url: z.string().url(),
  creator_handle: optText,
  posted_at: optText,
  format: z.enum(["reel", "carousel", "photo", "story", "short"]),
  duration_sec: optNum,
  language: optText,
  hook_type: z.enum(["promise", "question", "number", "action_frame", "contrast", "proof", "offer", "other"]),
  hook_text: optText,
  narrative_structure: z.enum(["process", "list", "before_after", "day_in_the_life", "testimonial", "offer", "other"]),
  cta: optText,
  creative_pattern: z.string().min(3),
  views: optInt,
  likes: optInt,
  comments: optInt,
  shares: optInt,
  saves: optInt,
  why_it_matters: optText,
  notes: optText,
});

export type ReferenceRow = z.infer<typeof ReferenceRow>;
export const REFERENCE_COLUMNS = Object.keys(ReferenceRow.shape) as (keyof ReferenceRow)[];
