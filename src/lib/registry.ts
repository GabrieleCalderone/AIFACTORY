/**
 * Unified Media Registry (data/media-registry.json): every known media file, keyed by SHA-256,
 * with its sources (local folder, pool copy, generated output, render), licence, consent,
 * provenance for synthetic media and immutable versions. Pure helpers; IO in registry-io.
 */
export type SourceKind =
  | "local"
  | "pool"
  | "generated"
  | "render"
  | "drive"
  | "github"
  | "r2";

export type AssetSource = {
  kind: SourceKind;
  path: string;
  addedAt: string;
  note?: string;
};

export type AssetRecord = {
  id: string; // sha256
  sources: AssetSource[];
  width?: number;
  height?: number;
  mime?: string;
  people?: "none" | "chef" | "guests";
  license: string; // "risthome-own" | "cc-by-4.0" | "higgsfield-terms" | ...
  synthetic: boolean;
  provenance?: Record<string, unknown>;
  status: "active" | "excluded" | "archived";
  firstSeen: string;
  lastSeen: string;
};

export type Registry = { version: 1; assets: Record<string, AssetRecord> };

export const emptyRegistry = (): Registry => ({ version: 1, assets: {} });

/** Add or refresh an asset; sources are deduplicated by kind+path, first/last seen maintained. */
export const upsertAsset = (
  reg: Registry,
  input: Omit<AssetRecord, "firstSeen" | "lastSeen" | "status"> & {
    status?: AssetRecord["status"];
  },
  now = new Date(),
): AssetRecord => {
  const at = now.toISOString();
  const existing = reg.assets[input.id];
  if (!existing) {
    const rec: AssetRecord = {
      ...input,
      status: input.status ?? "active",
      firstSeen: at,
      lastSeen: at,
    };
    reg.assets[input.id] = rec;
    return rec;
  }
  for (const s of input.sources) {
    if (!existing.sources.some((e) => e.kind === s.kind && e.path === s.path))
      existing.sources.push(s);
  }
  existing.width = input.width ?? existing.width;
  existing.height = input.height ?? existing.height;
  existing.mime = input.mime ?? existing.mime;
  existing.people = input.people ?? existing.people;
  existing.license = input.license || existing.license;
  existing.synthetic = input.synthetic || existing.synthetic;
  existing.provenance = input.provenance ?? existing.provenance;
  if (input.status) existing.status = input.status;
  existing.lastSeen = at;
  return existing;
};

export const findByPath = (
  reg: Registry,
  path: string,
): AssetRecord | undefined =>
  Object.values(reg.assets).find((a) => a.sources.some((s) => s.path === path));

export const summarizeRegistry = (
  reg: Registry,
): {
  total: number;
  synthetic: number;
  byKind: Record<string, number>;
  guests: number;
} => {
  const byKind: Record<string, number> = {};
  let synthetic = 0;
  let guests = 0;
  for (const a of Object.values(reg.assets)) {
    if (a.synthetic) synthetic++;
    if (a.people === "guests") guests++;
    for (const s of a.sources) byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
  }
  return { total: Object.keys(reg.assets).length, synthetic, byKind, guests };
};
