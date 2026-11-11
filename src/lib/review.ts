/**
 * Faithfulness review, pure part: applies the reviewer's verdicts to the spec nodes.
 * The reviewer is a model looking at photos, so nothing it returns is trusted beyond a
 * pre-enumerated set of fields, a length cap and a fixed list of photo defect codes.
 */
import path from "node:path";

export type ReviewPair = {
  where: string;
  /** image path as written in the spec (relative to public/) */
  file: string;
  /** the spec object the fields live on; fixes are written here */
  node: Record<string, unknown>;
  allowed: string[];
  /** fields the schema requires: an empty fix never removes them */
  required: string[];
};
export type ReviewItem = { where: string; ok: boolean; problem?: string; fix?: Record<string, string>; unfit?: string };

/** Photo defects that make an asset unpublishable whatever the text says. */
export const UNFIT_CODES = ["screenshot", "app_ui", "watermark", "guests", "collage"] as const;
export type UnfitCode = (typeof UNFIT_CODES)[number];

export const applyReview = (pairs: ReviewPair[], items: ReviewItem[]): { fixes: number; captionProblem: string; unfit: { file: string; code: UnfitCode }[]; log: string[] } => {
  const byWhere = new Map(pairs.map((p) => [p.where, p]));
  const unfit = new Map<string, UnfitCode>();
  const log: string[] = [];
  let fixes = 0;
  let captionProblem = "";
  for (const item of items) {
    const pair = byWhere.get(item.where);
    if (pair && item.unfit && (UNFIT_CODES as readonly string[]).includes(item.unfit)) {
      const file = path.basename(pair.file);
      if (!unfit.has(file)) unfit.set(file, item.unfit as UnfitCode);
    }
    if (item.ok) continue;
    if (item.where === "caption") {
      captionProblem = item.problem ?? "caption does not match the photos";
      continue;
    }
    if (!pair || !item.fix) continue;
    for (const [k, v] of Object.entries(item.fix)) {
      if (!pair.allowed.includes(k) || typeof v !== "string" || v.length > 320) continue;
      const value = v.trim();
      if (!value) {
        // An empty fix means "say nothing here": better silence than a wrong or clinical line.
        if (pair.required.includes(k) || !(k in pair.node)) continue;
        delete pair.node[k];
      } else {
        pair.node[k] = value;
      }
      fixes++;
      log.push(`${item.where}.${k}: ${item.problem ?? ""}`);
    }
  }
  return { fixes, captionProblem, unfit: [...unfit].map(([file, code]) => ({ file, code })), log };
};

/** What the texts currently say, after fixes: the only material a regenerated caption may draw on. */
export const factsOf = (pairs: ReviewPair[]): string =>
  pairs
    .map((p) => p.allowed.map((k) => p.node[k]).filter((v): v is string => typeof v === "string" && v.trim().length > 0).join(" / "))
    .filter(Boolean)
    .join("; ");

/** Key of a photo in content/dishes.json: the original file name, without pool index and extension. */
export const dishKey = (file: string): string =>
  path.basename(file).replace(/\.[^.]+$/, "").replace(/^\d{1,4}-(?=.)/, "").toLowerCase();
