import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readExperiments } from "./data.ts";
import { runGate, type GateResult, type MediaInfo } from "./gate.ts";
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
  return runGate({
    spec,
    exists: (p) => existsSync(publicFile(p)),
    info: mediaInfo,
    archetypeIds,
    experimentRows,
  });
};
