/**
 * Every approval or rejection a person gives is kept as a label: the post as it was, the
 * decision and the reason. The labels are what the automatic reviewers are measured
 * against (how often they agree with the person), so the standard is calibrated on the
 * owner's judgement and not on a model's taste.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import type { PostSpec } from "../schemas/post.ts";

export const LABELS_FILE = "data/review-labels.jsonl";
export type Decision = "approved" | "rejected";
export type ReviewLabel = {
  at: string;
  slug: string;
  decision: Decision;
  note?: string;
  source: "console" | "cli";
  standard?: string;
  archetype?: string;
  lang?: string;
  caption?: string;
  texts?: string[];
  images?: string[];
};

/** The post as the person saw it, reduced to what a reviewer judges: words and pictures. */
export const buildLabel = (input: { slug: string; decision: Decision; note?: string; source: ReviewLabel["source"]; at: Date; standard?: string; spec?: PostSpec | null }): ReviewLabel => {
  const { spec } = input;
  const label: ReviewLabel = { at: input.at.toISOString(), slug: input.slug, decision: input.decision, source: input.source };
  if (input.note?.trim()) label.note = input.note.trim().slice(0, 300);
  if (input.standard) label.standard = input.standard;
  if (!spec) return label;
  const texts: string[] = [];
  const images: string[] = [];
  const say = (...parts: (string | undefined)[]) => parts.forEach((p) => p?.trim() && texts.push(p.trim()));
  const show = (m: { image?: string; video?: string }) => {
    const media = m.image ?? m.video;
    if (media && !images.includes(media)) images.push(media);
  };
  if (spec.reel) {
    say(spec.reel.hook.title, spec.reel.hook.subtitle);
    show(spec.reel.hook);
    for (const s of spec.reel.scenes) {
      say(s.label, s.text);
      show(s);
    }
    say(spec.reel.cta.title, spec.reel.cta.line);
  }
  for (const s of spec.carousel?.slides ?? []) {
    say("kicker" in s ? s.kicker : undefined, s.title, "body" in s ? s.body : undefined);
    if ("image" in s && s.image) show({ image: s.image });
  }
  return { ...label, archetype: spec.brief.archetype, lang: spec.lang, caption: spec.caption, texts, images };
};

export const appendLabel = (label: ReviewLabel, file = LABELS_FILE): void => appendFileSync(file, JSON.stringify(label) + "\n");

export const readLabels = (file = LABELS_FILE): ReviewLabel[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as ReviewLabel)
    : [];

/** Below this many labels the agreement figures are too uncertain to act on. */
export const MIN_LABELS = 60;

/**
 * How a reviewer's pass/fail verdicts compare with the person's decisions. "Catches" is the
 * share of rejected posts the reviewer also failed; "lets through" the share of approved
 * posts it also passed. A post the reviewer could not judge counts in neither.
 */
export const agreement = (labels: ReviewLabel[], verdict: (label: ReviewLabel) => boolean | null): { judged: number; unknown: number; catches: number | null; letsThrough: number | null; enough: boolean } => {
  let tp = 0;
  let fn = 0;
  let tn = 0;
  let fp = 0;
  let unknown = 0;
  for (const label of labels) {
    const pass = verdict(label);
    if (pass === null) unknown++;
    else if (label.decision === "rejected") {
      if (pass) fn++;
      else tp++;
    } else if (pass) tn++;
    else fp++;
  }
  const judged = tp + fn + tn + fp;
  return { judged, unknown, catches: tp + fn ? tp / (tp + fn) : null, letsThrough: tn + fp ? tn / (tn + fp) : null, enough: judged >= MIN_LABELS };
};
