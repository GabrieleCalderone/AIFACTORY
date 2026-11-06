/**
 * Build the shared asset pool from the catalogue: only photos with people none|chef and
 * quality good|ok are copied (normalised, metadata stripped) into public/assets/pool/,
 * and the catalogue fields (subject, tags, quality, text_overlay) are merged into the
 * manifest so the author and the gate can use them. Guests are never copied.
 *
 *   node scripts/build-pool.ts [--catalog data/asset-catalog.json] [--pool pool]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { catalog: { type: "string", default: "data/asset-catalog.json" }, pool: { type: "string", default: "pool" } } });
type Entry = { people: "none" | "chef" | "guests"; subject: string; tags: string[]; quality: "good" | "ok" | "poor"; text_overlay: boolean; source: string };
const catalog = JSON.parse(readFileSync(values.catalog, "utf8")) as Record<string, Entry>;
const allowed = Object.entries(catalog).filter(([, e]) => e.people !== "guests" && e.quality !== "poor");
const bySrcAndPeople = new Map<string, string[]>();
for (const [name, e] of allowed) {
  const key = `${path.dirname(e.source)}|${e.people}`;
  bySrcAndPeople.set(key, [...(bySrcAndPeople.get(key) ?? []), name]);
}
const poolDir = path.join("public/assets", values.pool);
const manifestPath = path.join(poolDir, "manifest.json");
type Row = { file: string; source: string; width: number; height: number; orientation: string; people: string; subject?: string; tags?: string[]; quality?: string; text_overlay?: boolean };
const existing: Row[] = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Row[]) : [];
const have = new Set(existing.map((r) => r.source));
let start = existing.length + 1;
for (const [key, names] of bySrcAndPeople) {
  const [srcDir, people] = key.split("|");
  const todo = names.filter((n) => !have.has(n)).sort();
  if (todo.length === 0) continue;
  execFileSync("uv", ["run", "python", "-I", "tools/py/prepare_assets.py", values.pool, "--src", srcDir, "--pick", ...todo, "--people", people, "--start", String(start), "--max-side", "2160"], { stdio: "inherit" });
  start += todo.length;
}
const rows = (existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Row[]) : []).filter((r) => {
  const e = catalog[r.source];
  const keep = Boolean(e) && e.people !== "guests" && e.quality !== "poor";
  if (!keep) {
    rmSync(path.join(poolDir, r.file), { force: true });
    console.log(`removed ${r.file}: ${e ? `${e.people}/${e.quality}` : "not in catalogue"}`);
  }
  return keep;
});
for (const r of rows) {
  const e = catalog[r.source];
  Object.assign(r, { people: e.people, subject: e.subject, tags: e.tags, quality: e.quality, text_overlay: e.text_overlay });
}
writeFileSync(manifestPath, JSON.stringify(rows, null, 2) + "\n");
const skipped = Object.values(catalog).length - allowed.length;
console.log(`pool: ${rows.length} photos in ${poolDir} (${skipped} excluded: guests or poor quality)`);
