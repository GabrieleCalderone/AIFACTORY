import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readExperiments } from "./data.ts";
import { runGate, type GateResult, type MediaInfo } from "./gate.ts";
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
  const archetypes = existsSync("content/archetypes.json") ? (JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: { id: string; context?: Partial<ContextLimits> }[] }).archetypes : [];
  contextIssues(spec, contextCredits(), limitsFor(archetypes.find((a) => a.id === spec.brief.archetype))).forEach((issue) => result.errors.push(`context picture, ${issue}`));
  const standard = loadStandard();
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

/** The house standard every published text must meet; absent file = no standard to enforce. */
export const loadStandard = (): HouseStandard | null =>
  existsSync("content/house-standard.json") ? (JSON.parse(readFileSync("content/house-standard.json", "utf8")) as HouseStandard) : null;
