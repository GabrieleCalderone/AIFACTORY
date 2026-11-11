/**
 * House standard, deterministic part: the rules of content/house-standard.json that a
 * machine can check on every published text (length, banned vocabulary, punctuation).
 * The parts that need eyes (light, plating, mood) live in the author and reviewer prompts.
 */
import type { PostSpec } from "../schemas/post.ts";
import type { Scorecard } from "./scorecard.ts";

export type HouseStandard = {
  version: string;
  audience: string;
  limits: { hookTitleWords: number; sceneTextWords: number; slideTitleWords: number; slideBodyWords: number; captionChars: number; hashtagsMax: number; captionEmojiMax?: number; captionParagraphsMin?: number };
  /** Italian course names that say nothing to a traveller when they stand alone as a title. */
  courseWords?: string[];
  /** hype and sales vocabulary, per language; matched as whole words, case-insensitive */
  banned: Record<"it" | "en", string[]>;
  /** inventory-style descriptions of food by shape, colour or container; matched as phrases */
  clinical: string[];
  voice: string[];
  visual: string[];
  structure: string[];
  carousel?: string[];
  editing?: string[];
  calendar?: { services: string[]; maxServiceShare: number; maxOfferShare: number; offerArchetypes: string[]; rules: string[] };
  /** Being found: the place and one of the service phrases must be in every English caption. */
  seo?: { place: string; phrases: string[]; rules: string[] };
  measure?: { primary: string; then: string[]; commercial: string; rules: string[] };
  /** Editorial judgement out of 100 on a finished piece (src/lib/scorecard.ts). */
  scorecard?: Scorecard & { note?: string };
  principles: { id: string; rule: string; why: string }[];
};

export type Violation = { where: string; message: string; optional: boolean };

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (list: string[]): RegExp | null => (list.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "iu") : null);
const EMOJI = /\p{Extended_Pictographic}/u;

/** Every on-screen and caption text of a post with its path, word limit and whether it may be dropped. */
const fields = (spec: PostSpec, l: HouseStandard["limits"]): { where: string; text: string; maxWords?: number; optional: boolean }[] => {
  const out: { where: string; text: string; maxWords?: number; optional: boolean }[] = [];
  const add = (where: string, text: string | undefined, optional: boolean, maxWords?: number) => {
    if (text && text.trim()) out.push({ where, text, maxWords, optional });
  };
  if (spec.reel) {
    add("reel.hook.title", spec.reel.hook.title, false, l.hookTitleWords);
    add("reel.hook.subtitle", spec.reel.hook.subtitle, true, l.hookTitleWords);
    spec.reel.scenes.forEach((s, i) => {
      add(`reel.scenes.${i}.label`, s.label, true);
      add(`reel.scenes.${i}.text`, s.text, true, l.sceneTextWords);
    });
    add("reel.cta.title", spec.reel.cta.title, false, l.hookTitleWords);
    add("reel.cta.line", spec.reel.cta.line, true);
  }
  spec.carousel?.slides.forEach((s, i) => {
    const at = `carousel.slides.${i}`;
    if (s.type === "cover") {
      add(`${at}.title`, s.title, false, l.hookTitleWords);
      add(`${at}.kicker`, s.kicker, true);
    } else if (s.type === "photo") {
      add(`${at}.title`, s.title, true, l.slideTitleWords);
      add(`${at}.body`, s.body, true, l.slideBodyWords);
    } else {
      add(`${at}.title`, s.title, false);
      add(`${at}.body`, s.body, true);
    }
  });
  return out;
};

export const lintStandard = (spec: PostSpec, std: HouseStandard): Violation[] => {
  const out: Violation[] = [];
  const banned = phrase(std.banned[spec.lang] ?? []);
  const clinical = phrase(std.clinical);
  const check = (where: string, text: string, optional: boolean, maxWords?: number) => {
    const hype = banned?.exec(text);
    if (hype) out.push({ where, optional, message: `hype word "${hype[0]}"` });
    const inventory = clinical?.exec(text);
    if (inventory) out.push({ where, optional, message: `describes food like an inventory ("${inventory[0]}"): name the dish with the chef's name or say nothing` });
    if (text.includes("!")) out.push({ where, optional, message: "exclamation mark" });
    if (EMOJI.test(text) && !(where === "caption" && std.limits.captionEmojiMax)) out.push({ where, optional, message: "emoji" });
    if (maxWords !== undefined && words(text) > maxWords) out.push({ where, optional, message: `${words(text)} words, the house limit is ${maxWords}` });
  };
  for (const f of fields(spec, std.limits)) check(f.where, f.text, f.optional, f.maxWords);
  check("caption", spec.caption, false);
  // The caption is a short page: paragraphs with air between them, and a few symbols at most.
  const symbols = spec.caption.match(new RegExp(EMOJI.source, "gu"))?.length ?? 0;
  if (std.limits.captionEmojiMax && symbols > std.limits.captionEmojiMax) out.push({ where: "caption", optional: false, message: `${symbols} symbols, at most ${std.limits.captionEmojiMax}` });
  const paragraphs = spec.caption.split(/\n\s*\n/).filter((p) => p.trim()).length;
  if (std.limits.captionParagraphsMin && paragraphs < std.limits.captionParagraphsMin) out.push({ where: "caption", optional: false, message: `${paragraphs} paragraph(s): set the caption in at least ${std.limits.captionParagraphsMin} short paragraphs with a blank line between them` });
  // No sentence twice, and no bare course name as a title.
  const said = new Map<string, string>();
  const courses = new Set((std.courseWords ?? []).map((w) => w.toLowerCase()));
  for (const f of fields(spec, std.limits)) {
    const key = f.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key) continue;
    const format = f.where.split(".")[0];
    // the reel and the carousel are two pieces: a line may live once in each
    const first = said.get(`${format}:${key}`);
    if (first && key.split(" ").length > 1) out.push({ where: f.where, optional: f.optional, message: `the same words as ${first} ("${f.text.trim().slice(0, 40)}")` });
    else said.set(`${format}:${key}`, f.where);
    if (/\.(title|label)$/.test(f.where) && courses.has(key)) out.push({ where: f.where, optional: f.optional, message: `a bare course name ("${f.text.trim()}") is not a title: name the dish in the chef's words or leave it empty` });
  }
  if (std.seo && spec.lang === "en" && spec.carousel) {
    // A traveller who does not know the house must read where this is within the first two slides.
    const opening = spec.carousel.slides.slice(0, 2).map((sl) => [("kicker" in sl && sl.kicker) || "", ("title" in sl && sl.title) || "", ("body" in sl && sl.body) || ""].join(" ")).join(" ").toLowerCase();
    if (!opening.includes("sicily") && !opening.includes(std.seo.place.toLowerCase())) out.push({ where: "carousel.slides.0", optional: false, message: `the first two slides name neither Sicily nor ${std.seo.place}` });
  }
  if (std.seo && spec.lang === "en") {
    // The words people search with: said once, in the caption, in plain language.
    const text = spec.caption.toLowerCase();
    if (!text.includes(std.seo.place.toLowerCase())) out.push({ where: "caption", optional: false, message: `the caption does not name ${std.seo.place}` });
    if (!std.seo.phrases.some((p) => text.includes(p.toLowerCase()))) out.push({ where: "caption", optional: false, message: `the caption does not say what the house is (one of: ${std.seo.phrases.join(", ")})` });
    if (!spec.hashtags.some((t) => t.toLowerCase() === `#${std.seo!.place.toLowerCase()}`)) out.push({ where: "hashtags", optional: false, message: `no #${std.seo.place.toLowerCase()} among the hashtags` });
  }
  if (spec.caption.length > std.limits.captionChars) out.push({ where: "caption", optional: false, message: `${spec.caption.length} characters, the house limit is ${std.limits.captionChars}` });
  if (spec.hashtags.length > std.limits.hashtagsMax) out.push({ where: "hashtags", optional: false, message: `${spec.hashtags.length} hashtags, the house limit is ${std.limits.hashtagsMax}` });
  return out;
};

/**
 * "Say nothing" repair: removes optional on-screen texts that break the standard, on the raw
 * spec object. Returns the paths removed; what remains is for the gate to refuse.
 */
export const silence = (raw: unknown, violations: Violation[]): string[] => {
  const removed: string[] = [];
  for (const v of violations) {
    if (!v.optional || removed.includes(v.where)) continue;
    const keys = v.where.split(".");
    const field = keys.pop()!;
    let node: unknown = raw;
    for (const k of keys) node = node && typeof node === "object" ? (node as Record<string, unknown>)[k] : undefined;
    if (node && typeof node === "object" && field in node) {
      delete (node as Record<string, unknown>)[field];
      removed.push(v.where);
    }
  }
  return removed;
};
