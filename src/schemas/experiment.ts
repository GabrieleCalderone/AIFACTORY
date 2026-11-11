import { z } from "zod";

/**
 * One row of data/experiments.csv. Cells arrive as strings; numbers are parsed, empty
 * cells become null and are never estimated. Mirrors data/experiments.schema.json.
 */
const optInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int().nonnegative().nullable(),
);
const optNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().nonnegative().nullable(),
);
const optRatio = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().min(0).max(1).nullable(),
);
const optText = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable());

export const ExperimentStatus = z.enum(["draft", "rendered", "approved", "scheduled", "published", "measured", "archived"]);

export const ExperimentRow = z.object({
  experiment_id: z.string().regex(/^EXP-\d{3,}$/),
  variant_id: z.string().regex(/^[A-Z][A-Za-z0-9-]*$/),
  post_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  archetype: z.string().regex(/^A[1-9][0-9]?-[a-z-]+$/),
  platform: z.enum(["instagram", "tiktok", "facebook", "other"]),
  format: z.enum(["reel", "carousel", "reel+carousel", "photo", "story"]),
  hypothesis: z.string().min(1),
  success_metric: z.string().min(1),
  status: ExperimentStatus,
  published_at: optText,
  post_url: optText,
  reach: optInt,
  plays: optInt,
  avg_watch_time_sec: optNum,
  completion_rate: optRatio,
  likes: optInt,
  comments: optInt,
  saves: optInt,
  shares: optInt,
  profile_visits: optInt,
  link_clicks: optInt,
  inquiries: optInt,
  qualified_inquiries: optInt,
  bookings: optInt,
  revenue_eur: optNum,
  contribution_margin_eur: optNum,
  notes: optText,
});

export type ExperimentRow = z.infer<typeof ExperimentRow>;
export const EXPERIMENT_COLUMNS = Object.keys(ExperimentRow.shape) as (keyof ExperimentRow)[];
export const METRIC_COLUMNS = [
  "reach",
  "plays",
  "avg_watch_time_sec",
  "completion_rate",
  "likes",
  "comments",
  "saves",
  "shares",
  "profile_visits",
  "link_clicks",
  "inquiries",
  "qualified_inquiries",
  "bookings",
  "revenue_eur",
  "contribution_margin_eur",
] as const;
export type MetricColumn = (typeof METRIC_COLUMNS)[number];
