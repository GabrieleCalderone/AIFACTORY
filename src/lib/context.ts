/**
 * Context pictures: photographs that are not RistHome's (Sicily, the sea, raw produce),
 * taken from free-licence libraries to set the scene. Pure rules: which licences are
 * accepted, how a picture is credited, and where a post may use one. A context picture is
 * never the house's dish, table, kitchen or chef, and a post never presents it as such.
 */
import type { PostSpec } from "../schemas/post.ts";

export const CONTEXT_PREFIX = "assets/context/";
export const isContext = (image: string | undefined): boolean => Boolean(image?.startsWith(CONTEXT_PREFIX));

export type Licence = { ok: boolean; kind: "cc0" | "public-domain" | "by" | "refused"; needsCredit: boolean; why?: string };

/**
 * Accepted: CC0, public domain, CC BY. Refused: ShareAlike (a reel made from the picture
 * would have to carry the same licence), NonCommercial, NoDerivatives, and anything unknown.
 */
export const classifyLicence = (shortName: string): Licence => {
  const name = shortName.trim().toUpperCase().replace(/\s+/g, " ");
  const refuse = (why: string): Licence => ({ ok: false, kind: "refused", needsCredit: false, why });
  if (!name) return refuse("no licence stated");
  if (/\bNC\b/.test(name)) return refuse("non-commercial");
  if (/\bND\b/.test(name)) return refuse("no derivatives");
  if (/\bSA\b/.test(name)) return refuse("share-alike");
  if (/^CC0\b/.test(name) || name === "CC ZERO") return { ok: true, kind: "cc0", needsCredit: false };
  if (name === "PUBLIC DOMAIN" || /^PD\b/.test(name) || name === "PDM") return { ok: true, kind: "public-domain", needsCredit: false };
  if (/^CC BY \d(\.\d)?( [A-Z]{2})?$/.test(name)) return { ok: true, kind: "by", needsCredit: true };
  return refuse(`unrecognised licence "${shortName.trim().slice(0, 40)}"`);
};

/** Author names come as HTML from the library: tags and entities out, plain short text in. */
export const plainName = (html: string, max = 80): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[^\p{L}\p{N} .,'’()/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const creditLine = (artist: string, licenceShortName: string, library: string): string => {
  const who = plainName(artist) || "unknown author";
  return `${who}, ${licenceShortName.trim()}, via ${library}`;
};

export type ContextLimits = { maxPerReel: number; maxPerCarousel: number };
export const defaultContextLimits: ContextLimits = { maxPerReel: 2, maxPerCarousel: 1 };

/**
 * Where a post may use context pictures. The opening and the closing picture are always
 * the house's own; a context scene carries no label (labels name courses and steps of the
 * real experience); every credit owed is in the caption credits.
 */
export const contextIssues = (spec: PostSpec, creditOf: (image: string) => string | null | undefined, limits: ContextLimits = defaultContextLimits): string[] => {
  const issues: string[] = [];
  const owed = new Set<string>();
  const owe = (image: string) => {
    const credit = creditOf(image);
    if (credit === undefined) issues.push(`${image}: not an approved context picture`);
    else if (credit) owed.add(credit);
  };
  if (spec.reel) {
    const { hook, scenes } = spec.reel;
    if (isContext(hook.image)) issues.push("reel hook: the opening picture must be the house's own, not a context picture");
    const used = scenes.map((s, i) => ({ s, i })).filter(({ s }) => isContext(s.image));
    if (used.length > limits.maxPerReel) issues.push(`reel: ${used.length} context pictures, at most ${limits.maxPerReel}`);
    for (const { s, i } of used) {
      if (i === scenes.length - 1) issues.push(`reel scene ${i + 1}: the last picture must be the house's own, not a context picture`);
      if (s.label?.trim()) issues.push(`reel scene ${i + 1}: a context picture carries no label ("${s.label.trim()}")`);
      owe(s.image!);
    }
  }
  if (spec.carousel) {
    const slides = spec.carousel.slides;
    const used = slides.map((s, i) => ({ s, i })).filter(({ s }) => "image" in s && isContext(s.image));
    if (used.filter(({ s }) => s.type === "photo").length > limits.maxPerCarousel) issues.push(`carousel: more than ${limits.maxPerCarousel} context picture(s)`);
    for (const { s, i } of used) {
      if (s.type !== "photo") issues.push(`carousel slide ${i + 1}: a ${s.type} slide must use the house's own picture`);
      else if (s.title?.trim()) issues.push(`carousel slide ${i + 1}: a context picture carries no title ("${s.title.trim()}")`);
      owe((s as { image: string }).image);
    }
  }
  const given = new Set(spec.credits ?? []);
  for (const credit of owed) if (!given.has(credit)) issues.push(`missing photo credit in the caption: ${credit}`);
  return issues;
};

/** Removes labels and titles from context scenes and slides on the raw spec; returns the credits owed, in order of use. */
export const prepareContext = (raw: { reel?: { scenes: Record<string, unknown>[] }; carousel?: { slides: Record<string, unknown>[] } }, creditOf: (image: string) => string | null | undefined): string[] => {
  const credits: string[] = [];
  const note = (image: unknown) => {
    const credit = typeof image === "string" ? creditOf(image) : null;
    if (credit && !credits.includes(credit)) credits.push(credit);
  };
  for (const s of raw.reel?.scenes ?? []) {
    if (typeof s.image === "string" && isContext(s.image)) {
      delete s.label;
      note(s.image);
    }
  }
  for (const s of raw.carousel?.slides ?? []) {
    if (s.type === "photo" && typeof s.image === "string" && isContext(s.image)) {
      delete s.title;
      note(s.image);
    }
  }
  return credits;
};
