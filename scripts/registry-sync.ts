/**
 * Index every known media file into data/media-registry.json without duplicates:
 * pool photos (with catalogue people/consent), generated outputs with their provenance,
 * rendered reels and covers. Originals in the source folders are referenced, never copied.
 *
 *   node scripts/registry-sync.ts
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  emptyRegistry,
  summarizeRegistry,
  upsertAsset,
  type Registry,
} from "../src/lib/registry.ts";

const FILE = "data/media-registry.json";
const reg: Registry = existsSync(FILE)
  ? (JSON.parse(readFileSync(FILE, "utf8")) as Registry)
  : emptyRegistry();
const sha = (p: string) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
const now = new Date();
let n = 0;

// pool photos: people + source from the manifest, sha256 from the technical analysis when present
const technical = existsSync("data/asset-technical.json")
  ? (JSON.parse(readFileSync("data/asset-technical.json", "utf8")) as Record<
      string,
      { sha256: string; width: number; height: number }
    >)
  : {};
for (const dir of readdirSync("public/assets").filter((d) =>
  existsSync(path.join("public/assets", d, "manifest.json")),
)) {
  const rows = JSON.parse(
    readFileSync(path.join("public/assets", dir, "manifest.json"), "utf8"),
  ) as {
    file: string;
    source: string;
    width: number;
    height: number;
    people?: string;
    kind?: string;
  }[];
  for (const r of rows) {
    const p = path.join("public/assets", dir, r.file);
    if (!existsSync(p)) continue;
    const id = technical[r.file]?.sha256 ?? sha(p);
    const original = r.source && existsSync(r.source) ? r.source : null;
    upsertAsset(
      reg,
      {
        id,
        sources: [
          { kind: "pool", path: p, addedAt: now.toISOString() },
          ...(original
            ? [
                {
                  kind: "local" as const,
                  path: original,
                  addedAt: now.toISOString(),
                },
              ]
            : []),
        ],
        width: r.width,
        height: r.height,
        mime: r.kind === "video" ? "video/mp4" : "image/jpeg",
        people:
          (r.people as "none" | "chef" | "guests" | undefined) ?? undefined,
        license: "risthome-own",
        synthetic: false,
      },
      now,
    );
    n++;
  }
}
// generated outputs with provenance sidecars
const gen = "public/assets/generated";
if (existsSync(gen)) {
  for (const f of readdirSync(gen).filter((f) =>
    /\.(png|jpe?g|webp|mp4|mov|webm)$/i.test(f),
  )) {
    const p = path.join(gen, f);
    const side = `${p}.provenance.json`;
    const provenance = existsSync(side)
      ? (JSON.parse(readFileSync(side, "utf8")) as Record<string, unknown>)
      : undefined;
    upsertAsset(
      reg,
      {
        id: sha(p),
        sources: [{ kind: "generated", path: p, addedAt: now.toISOString() }],
        mime: /\.(mp4|mov|webm)$/i.test(f) ? "video/mp4" : "image/*",
        license: String(provenance?.license ?? "higgsfield-terms"),
        synthetic: true,
        provenance,
        people: "none",
      },
      now,
    );
    n++;
  }
}
// renders
if (existsSync("out")) {
  for (const slug of readdirSync("out")) {
    for (const f of ["reel.mp4", "reel-cover.jpg"]) {
      const p = path.join("out", slug, f);
      if (!existsSync(p) || !statSync(p).isFile()) continue;
      upsertAsset(
        reg,
        {
          id: sha(p),
          sources: [
            { kind: "render", path: p, addedAt: now.toISOString(), note: slug },
          ],
          mime: f.endsWith(".mp4") ? "video/mp4" : "image/jpeg",
          license: "risthome-own",
          synthetic: false,
        },
        now,
      );
      n++;
    }
  }
}
writeFileSync(FILE, JSON.stringify(reg, null, 1) + "\n");
const s = summarizeRegistry(reg);
console.log(
  `registry: ${s.total} assets (${n} touched) | synthetic ${s.synthetic} | guests ${s.guests} | sources ${JSON.stringify(s.byKind)} -> ${FILE}`,
);
