/**
 * Context pictures: photographs that are not RistHome's (Sicily, the sea, raw produce),
 * taken from free-licence libraries to set the scene. Pure rules: which licences are
 * accepted, how a picture is credited, and where a post may use one. A context picture is
 * never the house's dish, table, kitchen or chef, and a post never presents it as such.
 */
import type { PostSpec } from "../schemas/post.ts";

export const CONTEXT_PREFIX = "assets/context/";
/** Pictures made or animated by a generative model. Only ever context, never the house's food, table, kitchen or people. */
export const GENERATED_PREFIX = "assets/generated/";
/** Sound made by a generative model (scripts/sound-beds.ts): realistic ambience is disclosed like generated pictures. */
export const GENERATED_AUDIO_PREFIX = "audio/beds/";
export const isGenerated = (media: string | undefined): boolean => Boolean(media?.startsWith(GENERATED_PREFIX) || media?.startsWith(GENERATED_AUDIO_PREFIX));
/** True for every picture that is not the house's own: licensed context and generated context alike. */
export const isContext = (image: string | undefined): boolean => Boolean(image?.startsWith(CONTEXT_PREFIX) || image?.startsWith(GENERATED_PREFIX));

/**
 * What was done to a picture, read from where it lives:
 * real = the house's own photograph or clip (cropping, colour and non-inventing enlargement included);
 * context = someone else's licensed photograph; generated = made or animated by a model.
 */
export type Operation = "real" | "context" | "generated";
export const operationOf = (media: string): Operation => (isGenerated(media) ? "generated" : media.startsWith(CONTEXT_PREFIX) ? "context" : "real");

export type Licence = { ok: boolean; kind: "cc0" | "public-domain" | "by" | "library" | "refused"; needsCredit: boolean; why?: string };

/**
 * Accepted: CC0, public domain, CC BY, and the Unsplash and Pexels library licences (free
 * commercial use and modification; the photographer is credited as the libraries ask). Refused: ShareAlike (a reel made from the picture
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
  if (name === "UNSPLASH LICENSE" || name === "PEXELS LICENSE") return { ok: true, kind: "library", needsCredit: true };
  return refuse(`unrecognised licence "${shortName.trim().slice(0, 40)}"`);
};

/** Author names come as HTML from the library: tags and entities out, plain short text in. */
export const plainName = (html: string, max = 80): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    // a name is not an address: links, domains and handles written into the author field are dropped
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b(?:\/\S*)?/gi, " ")
    .replace(/@\w+/g, " ")
    .replace(/[^\p{L}\p{N} .,'’()/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const creditLine = (artist: string, licenceShortName: string, library: string): string => {
  const who = plainName(artist) || "unknown author";
  // A library's own licence is named by the library: "Mario Rossi, Unsplash".
  if (classifyLicence(licenceShortName).kind === "library") return `${who}, ${library}`;
  return `${who}, ${licenceShortName.trim()}, via ${library}`;
};

/**
 * coverMayBeContext: for the editorial formats about the island and the season, the cover may be
 * a licensed picture of the place. The piece still ends on the house's own photograph.
 */
export type ContextLimits = { maxPerReel: number; maxPerCarousel: number; coverMayBeContext?: boolean };
export const defaultContextLimits: ContextLimits = { maxPerReel: 2, maxPerCarousel: 1 };
/** The limits of one format: what the archetype declares, over the house defaults. */
export const limitsFor = (archetype: { context?: Partial<ContextLimits> } | undefined): ContextLimits => ({ ...defaultContextLimits, ...(archetype?.context ?? {}) });

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
    // image or clip, licensed or generated: the opening is always the house's own
    if (isContext(hook.image ?? hook.video)) issues.push("reel hook: the opening picture must be the house's own, not a context or generated picture");
    const used = scenes.map((s, i) => ({ s, i })).filter(({ s }) => isContext(s.image ?? s.video));
    if (used.length > limits.maxPerReel) issues.push(`reel: ${used.length} context pictures, at most ${limits.maxPerReel}`);
    for (const { s, i } of used) {
      if (i === scenes.length - 1) issues.push(`reel scene ${i + 1}: the last picture must be the house's own, not a context picture`);
      if (s.label?.trim()) issues.push(`reel scene ${i + 1}: a context picture carries no label ("${s.label.trim()}")`);
      // A clip is not looked at by the text reviewer, so it carries no words at all.
      if (s.video && s.text?.trim()) issues.push(`reel scene ${i + 1}: a moving context clip carries no text ("${s.text.trim().slice(0, 40)}")`);
      owe((s.image ?? s.video)!);
    }
  }
  if (spec.carousel) {
    const slides = spec.carousel.slides;
    const used = slides.map((s, i) => ({ s, i })).filter(({ s }) => "image" in s && isContext(s.image));
    // the cover counts too, where a format lets it be a context picture
    if (used.filter(({ s }) => s.type === "photo" || s.type === "cover").length > limits.maxPerCarousel) issues.push(`carousel: more than ${limits.maxPerCarousel} context picture(s)`);
    for (const { s, i } of used) {
      if (s.type === "cover" && limits.coverMayBeContext) {
        // the cover sets the place; its credit is owed like any other
      } else if (s.type !== "photo") issues.push(`carousel slide ${i + 1}: a ${s.type} slide must use the house's own picture`);
      else if (s.title?.trim()) issues.push(`carousel slide ${i + 1}: a context picture carries no title ("${s.title.trim()}")`);
      owe((s as { image: string }).image);
    }
  }
  if (spec.carousel && limits.coverMayBeContext) {
    // A piece that opens on the island closes on the house: the last photograph is the house's own, and there is more than one of them.
    const pictures = spec.carousel.slides.filter((s): s is Extract<typeof s, { image: string }> => "image" in s && typeof s.image === "string" && s.type !== "cta");
    // different photographs of the house: a detail of the same picture, or the same file twice, counts once
    const own = new Set(pictures.filter((s) => !isContext(s.image) && !(s.type === "photo" && s.detail)).map((s) => s.image));
    if (pictures.length && isContext(pictures[pictures.length - 1].image)) issues.push("carousel: the last photograph must be the house's own");
    if (own.size < 2) issues.push(`carousel: ${own.size} of the house's own photographs, at least 2`);
  }
  // Generated material is disclosed: the post is flagged so the platforms show their AI label.
  const made = generatedIn(spec);
  const generated = [...made.reel, ...made.carousel];
  if (generated.length && spec.aiGenerated !== true) issues.push(`generated material (${generated[0]}) in a post that is not marked aiGenerated`);
  const given = new Set(spec.credits ?? []);
  for (const credit of owed) if (!given.has(credit)) issues.push(`missing photo credit in the caption: ${credit}`);
  // Credits are printed in the caption: only the ones owed for the pictures used may be there.
  for (const credit of given) if (!owed.has(credit)) issues.push(`credit not owed by any picture of this post: "${credit.slice(0, 60)}"`);
  return issues;
};

/**
 * Generated material per format: pictures, clips and sound. The disclosure follows the format
 * that carries it, so a reel with a generated sound bed is labelled while the carousel of the
 * same post, which has none, still goes to every channel.
 */
export const generatedIn = (spec: PostSpec): { reel: string[]; carousel: string[] } => ({
  reel: spec.reel ? [...[spec.reel.hook, ...spec.reel.scenes].flatMap((m) => [m.image, m.video]), spec.reel.audio?.src].filter((m): m is string => isGenerated(m)) : [],
  carousel: (spec.carousel?.slides ?? []).map((s) => ("image" in s ? s.image : undefined)).filter((m): m is string => isGenerated(m)),
});

/** Removes labels and titles from context scenes and slides on the raw spec; returns the credits owed, in order of use. */
export const prepareContext = (raw: { reel?: { scenes: Record<string, unknown>[] }; carousel?: { slides: Record<string, unknown>[] } }, creditOf: (image: string) => string | null | undefined): string[] => {
  const credits: string[] = [];
  const note = (image: unknown) => {
    const credit = typeof image === "string" ? creditOf(image) : null;
    if (credit && !credits.includes(credit)) credits.push(credit);
  };
  for (const s of raw.reel?.scenes ?? []) {
    const media = typeof s.image === "string" ? s.image : typeof s.video === "string" ? s.video : undefined;
    if (isContext(media)) {
      delete s.label;
      // words on a clip would reach the audience without the photo-and-text review
      if (typeof s.video === "string") delete s.text;
      note(media);
    }
  }
  for (const s of raw.carousel?.slides ?? []) {
    if (s.type === "photo" && typeof s.image === "string" && isContext(s.image)) {
      delete s.title;
      note(s.image);
    }
    // a context cover (only the formats that allow one) keeps its title and owes its credit like any other
    if (s.type === "cover" && typeof s.image === "string" && isContext(s.image)) note(s.image);
  }
  return credits;
};
