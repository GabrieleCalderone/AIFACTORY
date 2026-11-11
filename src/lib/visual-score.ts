/**
 * Visual Quality & Brand Fit Engine (pure, unit-tested).
 *
 *   Q = 0.30 A + 0.25 R + 0.20 T + 0.15 C + 0.10 U
 *
 * A aesthetic (visual LLM), R relevance to the service being sold (visual LLM service_fit),
 * T technical (deterministic: sharpness, exposure, noise, contrast, resolution),
 * C composition (text space, centre weight, orientation, format fit),
 * U originality (usage ledger and near-duplicate groups).
 * Hard constraints (people without consent, printed logos, screenshots/collages, human
 * exclusion) block an asset regardless of its score. Every verdict carries its reasons.
 */

/** The two experiences the house sells. Older catalogue entries still carry marks for retired lines; they are ignored. */
export type Service = "class" | "chef";
export type Format = "reel" | "carousel";

export type TechnicalRow = {
  file: string;
  sha256: string;
  dhash: string;
  width: number;
  height: number;
  portrait: boolean;
  brightness_mean: number;
  brightness_p5: number;
  brightness_p95: number;
  clipped_dark: number;
  clipped_bright: number;
  contrast: number;
  sharpness: number;
  noise: number;
  saturation: number;
  text_space_bottom: number;
  center_weight: number;
  dup_group: number;
  dup_count: number;
};

export type CatalogRow = {
  people: "none" | "chef" | "guests";
  subject: string;
  tags: string[];
  quality: "good" | "ok" | "poor";
  text_overlay: boolean;
  aesthetic: number;
  premium_fit: number;
  service_fit: Record<Service, number>;
  format_fit: Record<Format, number>;
  issues: string[];
};

export type Override = { include?: boolean; exclude?: boolean; note?: string };

export type Weights = { A: number; R: number; T: number; C: number; U: number };
export const defaultWeights: Weights = {
  A: 0.3,
  R: 0.25,
  T: 0.2,
  C: 0.15,
  U: 0.1,
};
export const thresholds = { premium: 85, usable: 70 } as const;

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) =>
  clamp(
    y0 + ((x - x0) * (y1 - y0)) / (x1 - x0),
    Math.min(y0, y1),
    Math.max(y0, y1),
  );

/** Deterministic technical score 0-100 with the reasons that cost points. */
export const technicalScore = (
  t: TechnicalRow,
  format: Format,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  // sharpness: Laplacian variance on a 1024 px copy; < 40 is soft, > 300 is crisp
  const sharp = lerp(
    Math.log10(Math.max(t.sharpness, 1)),
    Math.log10(40),
    Math.log10(300),
    0,
    100,
  );
  if (sharp < 40) reasons.push(`soft focus (sharpness ${t.sharpness})`);
  // exposure: mean 90..190 is fine; penalties outside; clipping penalised
  let exposure = 100;
  if (t.brightness_mean < 90)
    exposure = lerp(t.brightness_mean, 40, 90, 0, 100);
  else if (t.brightness_mean > 190)
    exposure = lerp(t.brightness_mean, 190, 245, 100, 20);
  if (t.brightness_mean < 90)
    reasons.push(`dark (mean brightness ${t.brightness_mean})`);
  if (t.brightness_mean > 190)
    reasons.push(`very bright (mean brightness ${t.brightness_mean})`);
  const clip = Math.max(t.clipped_dark, t.clipped_bright);
  if (clip > 0.05) {
    exposure -= lerp(clip, 0.05, 0.25, 0, 50);
    reasons.push(`clipped ${(clip * 100).toFixed(0)}%`);
  }
  const noise = t.noise > 3 ? lerp(t.noise, 3, 6, 100, 30) : 100;
  if (t.noise > 3) reasons.push(`noisy (${t.noise})`);
  const contrast = t.contrast < 35 ? lerp(t.contrast, 15, 35, 30, 100) : 100;
  if (t.contrast < 35) reasons.push(`flat contrast (${t.contrast})`);
  const needW = 1080;
  const needH = format === "reel" ? 1920 : 1350;
  const factor = Math.max(needW / t.width, needH / t.height);
  const resolution =
    factor <= 1
      ? 100
      : factor <= 2
        ? lerp(factor, 1, 2, 100, 55)
        : lerp(factor, 2, 3, 55, 0);
  if (factor > 1.5)
    reasons.push(`upscaled ${factor.toFixed(1)}x for ${format}`);
  const score = clamp(
    0.35 * sharp +
      0.3 * clamp(exposure) +
      0.1 * noise +
      0.1 * contrast +
      0.15 * resolution,
  );
  return { score: Math.round(score), reasons };
};

/** Composition 0-100: room for text, subject centring, orientation and the LLM's format fit. */
export const compositionScore = (
  t: TechnicalRow,
  c: CatalogRow,
  format: Format,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  const textSpace = lerp(t.text_space_bottom, 0.25, 0.8, 20, 100);
  if (t.text_space_bottom < 0.33)
    reasons.push("busy bottom third, little room for captions");
  const centre =
    t.center_weight >= 0.9 && t.center_weight <= 1.6
      ? 100
      : t.center_weight < 0.9
        ? lerp(t.center_weight, 0.5, 0.9, 40, 100)
        : lerp(t.center_weight, 1.6, 2.2, 100, 60);
  const orientation =
    format === "reel" ? (t.portrait ? 100 : 55) : t.portrait ? 85 : 100;
  if (format === "reel" && !t.portrait)
    reasons.push("landscape photo on a vertical reel");
  const fit = c.format_fit[format] ?? 50;
  const score = clamp(
    0.3 * textSpace + 0.2 * centre + 0.2 * orientation + 0.3 * fit,
  );
  return { score: Math.round(score), reasons };
};

/** Originality 0-100 from the usage ledger and near-duplicate groups. */
export const originalityScore = (
  t: TechnicalRow,
  usedTimes: number,
  groupUsedTimes: number,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 100 - usedTimes * 35 - groupUsedTimes * 20;
  if (usedTimes > 0) reasons.push(`already published ${usedTimes}x`);
  if (groupUsedTimes > 0)
    reasons.push(`a near-duplicate was published ${groupUsedTimes}x`);
  if (t.dup_count > 1 && usedTimes === 0 && groupUsedTimes === 0) {
    score -= 5;
    reasons.push(`${t.dup_count - 1} near-duplicate(s) in the pool`);
  }
  return { score: clamp(score), reasons };
};

export type Verdict = {
  file: string;
  service: Service;
  format: Format;
  Q: number;
  parts: { A: number; R: number; T: number; C: number; U: number };
  tier: "premium" | "usable" | "excluded" | "blocked";
  blocked: boolean;
  reasons: string[];
};

export const scoreAsset = (input: {
  tech: TechnicalRow;
  cat: CatalogRow;
  service: Service;
  format: Format;
  usedTimes: number;
  groupUsedTimes: number;
  override?: Override;
  weights?: Weights;
}): Verdict => {
  const { tech, cat, service, format, override } = input;
  const w = input.weights ?? defaultWeights;
  const reasons: string[] = [];
  const blocks: string[] = [];
  if (cat.people === "guests")
    blocks.push("recognisable guests without recorded consent");
  if (cat.text_overlay || cat.issues.includes("logo_overlay"))
    blocks.push("printed logo or text on the photo");
  if (cat.issues.includes("screenshot") || cat.issues.includes("collage"))
    blocks.push("screenshot or collage, not a photograph");
  if (cat.quality === "poor") blocks.push("catalogued as poor quality");
  if (override?.exclude)
    blocks.push(`excluded by hand${override.note ? `: ${override.note}` : ""}`);

  const A = Math.round(0.7 * cat.aesthetic + 0.3 * cat.premium_fit);
  const R = Math.round(cat.service_fit[service] ?? 0);
  const T = technicalScore(tech, format);
  const C = compositionScore(tech, cat, format);
  const U = originalityScore(tech, input.usedTimes, input.groupUsedTimes);
  reasons.push(...T.reasons, ...C.reasons, ...U.reasons);
  if (cat.premium_fit < 40)
    reasons.push(
      `premium fit ${cat.premium_fit}: ${cat.issues.filter((i) => i !== "none").join(", ") || "plain styling"}`,
    );
  if (R < 40) reasons.push(`weak fit for ${service} (${R})`);
  const Q = Math.round(
    w.A * A + w.R * R + w.T * T.score + w.C * C.score + w.U * U.score,
  );
  let tier: Verdict["tier"] =
    Q >= thresholds.premium
      ? "premium"
      : Q >= thresholds.usable
        ? "usable"
        : "excluded";
  if (override?.include && tier === "excluded" && blocks.length === 0) {
    tier = "usable";
    reasons.push(
      `included by hand${override.note ? `: ${override.note}` : ""}`,
    );
  }
  const blocked = blocks.length > 0;
  return {
    file: tech.file,
    service,
    format,
    Q,
    parts: { A, R, T: T.score, C: C.score, U: U.score },
    tier: blocked ? "blocked" : tier,
    blocked,
    reasons: [...blocks, ...reasons],
  };
};

/** Best N candidates for a service and format: usable or better, one per near-duplicate group, highest Q first. */
export const rankForService = (
  verdicts: Verdict[],
  techByFile: Record<string, TechnicalRow>,
  n: number,
): Verdict[] => {
  const seenGroups = new Set<number>();
  const out: Verdict[] = [];
  for (const v of [...verdicts]
    .filter((v) => !v.blocked && v.tier !== "excluded")
    .sort((a, b) => b.Q - a.Q)) {
    const g = techByFile[v.file]?.dup_group ?? -1;
    if (g >= 0 && seenGroups.has(g)) continue;
    seenGroups.add(g);
    out.push(v);
    if (out.length >= n) break;
  }
  return out;
};
