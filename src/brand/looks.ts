/**
 * Editorial looks per product line. A look sets the colour grade applied to photos
 * (CSS filters at render time), the accent used for chips and rules, and the typographic
 * register. Chosen from the post's archetype service (class | chef: the two experiences the house sells).
 */
export type Service = "class" | "chef";

export type Look = {
  id: Service;
  name: string;
  /** CSS filter chain applied to every photo frame (deterministic, no AI). */
  grade: string;
  /** Extra vignette strength 0-1 (rendered as a radial gradient overlay). */
  vignette: number;
  accent: string;
  chipTone: "accent" | "light";
  titleWeight: 700 | 800;
  titleTracking: string;
  eyebrow: { it: string; en: string };
};

export const looks: Record<Service, Look> = {
  class: {
    id: "class",
    name: "Workshop warmth",
    grade: "contrast(1.06) saturate(1.08) brightness(1.03) sepia(0.06)",
    vignette: 0.25,
    accent: "#983038",
    chipTone: "accent",
    titleWeight: 800,
    titleTracking: "-0.01em",
    eyebrow: { it: "Lezione di cucina · Palermo", en: "Cooking class · Palermo" },
  },
  chef: {
    id: "chef",
    name: "Private table",
    grade: "contrast(1.08) saturate(0.96) brightness(1.0) sepia(0.1)",
    vignette: 0.38,
    accent: "#6e1f26",
    chipTone: "light",
    titleWeight: 700,
    titleTracking: "0",
    eyebrow: { it: "Chef a domicilio", en: "Private chef at home" },
  },
};

/** Archetype id -> service (mirrors content/archetypes.json "service"); defaults to class. */
export const lookForArchetype = (archetypeId: string, catalog: { id: string; service?: string }[]): Look => {
  const service = catalog.find((a) => a.id === archetypeId)?.service;
  // a retired format of a line the house no longer sells falls back to the class look
  return service === "chef" ? looks.chef : looks.class;
};
