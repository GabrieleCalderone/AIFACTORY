import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readExperiments } from "./data.ts";
import { runGate, weakLeads, type GateResult, type MediaInfo } from "./gate.ts";
import { consentProblem, type Consents } from "./consent.ts";
import { CONTEXT_PREFIX, GENERATED_PREFIX, contextIssues, isGenerated, limitsFor, type ContextLimits } from "./context.ts";
import { lintStandard, type HouseStandard } from "./house-standard.ts";
import type { PostSpec } from "../schemas/post.ts";

const PUBLIC_ROOT = path.resolve("public");

/** Resolve a spec media path and refuse anything that escapes public/. */
export const publicFile = (publicPath: string): string => {
  const resolved = path.resolve(PUBLIC_ROOT, publicPath);
  if (!resolved.startsWith(PUBLIC_ROOT + path.sep)) throw new Error(`media path escapes public/: ${publicPath}`);
  return resolved;
};

/** Wires the pure gate to the file system, the asset manifests, ffprobe and the data files. */
export const mediaInfo = (publicPath: string): MediaInfo => {
  const file = publicFile(publicPath);
  const manifest = path.join(path.dirname(file), "manifest.json");
  if (existsSync(manifest)) {
    const rows = JSON.parse(readFileSync(manifest, "utf8")) as { file: string; width: number; height: number; people?: string; durationSec?: number }[];
    const row = rows.find((r) => r.file === path.basename(publicPath));
    if (row) return { width: row.width, height: row.height, people: row.people, durationSec: row.durationSec };
  }
  if (/\.(mp4|mov|webm)$/i.test(publicPath)) {
    try {
      const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
      const j = JSON.parse(out) as { streams?: { width: number; height: number }[]; format?: { duration?: string } };
      const s = j.streams?.[0];
      if (s) return { width: s.width, height: s.height, durationSec: j.format?.duration ? Number(j.format.duration) : undefined };
    } catch {
      return null;
    }
  }
  return null;
};

export const gateSpec = (spec: PostSpec): GateResult => {
  const archetypeIds = (JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: { id: string }[] }).archetypes.map((a) => a.id);
  const experimentRows = existsSync("data/experiments.csv")
    ? readExperiments().raw.map((r) => ({ experiment_id: r.experiment_id, variant_id: r.variant_id }))
    : [];
  const result = runGate({
    spec,
    exists: (p) => existsSync(publicFile(p)),
    info: mediaInfo,
    archetypeIds,
    experimentRows,
  });
  const archetypes = existsSync("content/archetypes.json") ? (JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: { id: string; active?: boolean; service?: string; context?: Partial<ContextLimits> }[] }).archetypes : [];
  // A draft in a retired format, or for a line the house no longer sells, never reaches rendering or publishing.
  const format = archetypes.find((a) => a.id === spec.brief.archetype);
  const sold = loadStandard()?.calendar?.services ?? ["class", "chef"];
  if (format?.active === false) result.errors.push(`the format ${format.id} is retired`);
  else if (format && !sold.includes(format.service ?? "")) result.errors.push(`the format ${format.id} sells "${format.service ?? "nothing"}", which the house does not offer`);
  contextIssues(spec, contextCredits(), limitsFor(archetypes.find((a) => a.id === spec.brief.archetype)), premiumFitOf()).forEach((issue) => result.errors.push(`context picture, ${issue}`));
  const standard = loadStandard();
  // Guests: a manifest that says "consented" is not enough, there must be a written yes on record for the very file.
  // And a weak photograph of the house never opens or closes a piece.
  const consents = existsSync("data/consents.json") ? (JSON.parse(readFileSync("data/consents.json", "utf8")) as Consents) : {};
  const pictures = spec.carousel ? spec.carousel.slides.filter((s): s is Extract<typeof s, { image: string }> => "image" in s && typeof s.image === "string" && s.type !== "cta") : [];
  for (const image of new Set([...(spec.reel ? [spec.reel.hook, ...spec.reel.scenes].map((m) => m.image ?? m.video) : []), ...pictures.map((s) => s.image)])) {
    if (!image || mediaInfo(image)?.people !== "guests-consented") continue;
    const file = publicFile(image);
    const problem = consentProblem(existsSync(file) ? consents[createHash("sha256").update(readFileSync(file)).digest("hex")] : undefined);
    if (problem) result.errors.push(`${image}: guests in the picture, ${problem}`);
  }
  for (const issue of weakLeads(spec, premiumFitOf())) result.errors.push(issue);
  if (standard) lintStandard(spec, standard).forEach((v) => result.errors.push(`house standard, ${v.where}: ${v.message}`));
  return result;
};

export type ContextRow = { file: string; width: number; height: number; orientation?: string; people: string; subject?: string; category?: string; credit: string | null; licence?: string; source?: string };
/** Context pictures a person approved (scripts/source-context.ts approve). */
export const contextRows = (): ContextRow[] => {
  const manifest = path.join(PUBLIC_ROOT, CONTEXT_PREFIX, "manifest.json");
  return existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as ContextRow[]) : [];
};
export type GeneratedRow = { file: string; width: number; height: number; durationSec: number; people: "none"; subject: string; credit: string | null; source: string; model: string };
/** Clips made by a generative model from an approved context picture (scripts/add-generated.ts). */
export const generatedRows = (): GeneratedRow[] => {
  const manifest = path.join(PUBLIC_ROOT, GENERATED_PREFIX, "manifest.json");
  return existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as GeneratedRow[]) : [];
};
/** Credit owed for a context picture: a string, null when none is owed, undefined when the picture is not approved. */
export const contextCredits = (): ((image: string) => string | null | undefined) => {
  const rows = new Map(contextRows().map((r) => [`${CONTEXT_PREFIX}${r.file}`, r.credit ?? null]));
  const made = new Map(generatedRows().map((r) => [`${GENERATED_PREFIX}${r.file}`, r.credit ?? null]));
  // Generated material must have its provenance record next to it; a clip animated from a licensed photograph still owes that photograph's credit.
  return (image) => (isGenerated(image) ? (existsSync(`${publicFile(image)}.provenance.json`) ? (made.get(image) ?? null) : undefined) : rows.get(image));
};

/** How well a pool photograph fits a starred house (0-100), from the catalogue; undefined when the catalogue does not know the file. */
export const premiumFitOf = (pool = "pool"): ((image: string) => number | undefined) => {
  const manifest = path.join(PUBLIC_ROOT, "assets", pool, "manifest.json");
  const rows = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as { file: string; source?: string }[]) : [];
  const catalogue = existsSync("data/asset-catalog.json") ? (JSON.parse(readFileSync("data/asset-catalog.json", "utf8")) as Record<string, { premium_fit?: number }>) : {};
  const fit = new Map(rows.map((r) => [`assets/${pool}/${r.file}`, catalogue[path.basename(r.source ?? "")]?.premium_fit]));
  return (image) => fit.get(image);
};

/** The house standard every published text must meet; absent file = no standard to enforce. */
export const loadStandard = (): HouseStandard | null =>
  existsSync("content/house-standard.json") ? (JSON.parse(readFileSync("content/house-standard.json", "utf8")) as HouseStandard) : null;
