/**
 * Catalogue a photo folder with headless Claude Code (vision): who is visible (consent
 * gate), what the photo shows (so texts stay faithful), tags and quality.
 *
 *   node scripts/describe-assets.ts --src "/path/to/photos" [--out data/asset-catalog.json] [--model sonnet]
 *
 * Builds labelled contact sheets with tools/py/contact_sheet.py, asks Claude for one JSON
 * array per sheet, validates it, merges by source filename. Re-runs only add or refresh
 * entries. Needs the `claude` CLI logged in (uses the subscription, no API key).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

const { values } = parseArgs({
  options: {
    src: { type: "string" },
    out: { type: "string", default: "data/asset-catalog.json" },
    model: { type: "string", default: "sonnet" },
    "per-sheet": { type: "string", default: "30" },
    force: { type: "boolean", default: false },
  },
});
if (!values.src) {
  console.error("usage: node scripts/describe-assets.ts --src <dir> [--out data/asset-catalog.json]");
  process.exit(2);
}

export const CatalogEntry = z.object({
  index: z.number().int().nonnegative(),
  people: z.enum(["none", "chef", "guests"]),
  subject: z.string().min(3).max(200),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
  quality: z.enum(["good", "ok", "poor"]),
  text_overlay: z.boolean().default(false),
});
const Sheet = z.array(CatalogEntry).min(1);

const src = path.resolve(values.src);
const work = path.join(tmpdir(), `risthome-sheets-${Date.now()}`);
mkdirSync(work, { recursive: true });
execFileSync("uv", ["run", "python", "-I", "tools/py/contact_sheet.py", src, work, "--cols", "6", "--thumb", "300", "--per-sheet", values["per-sheet"], "--prefix", "sheet"], { stdio: "inherit" });
const index = readFileSync(path.join(work, "sheet-index.tsv"), "utf8")
  .trim()
  .split("\n")
  .map((l) => l.split("\t"))
  .map(([i, name]) => ({ index: Number(i), name }));
const sheets = readdirSync(work).filter((f) => /^sheet-\d+\.jpg$/.test(f)).sort();

type Catalog = Record<string, z.infer<typeof CatalogEntry> & { source: string; cataloguedAt: string }>;
const catalog: Catalog = existsSync(values.out) ? (JSON.parse(readFileSync(values.out, "utf8")) as Catalog) : {};

const ask = (sheetPath: string, expected: number[]): z.infer<typeof Sheet> => {
  const prompt = `You are cataloguing photos for a Sicilian chef's social media. Read the contact sheet image at ${sheetPath}. It is a grid of ${expected.length} photos; under each photo a black label shows its index and filename ("NNN name.jpg"). The indexes on this sheet are: ${expected.join(", ")}.
For EVERY photo return one object: {"index": <NNN as integer>, "people": "none"|"chef"|"guests", "subject": "<what is visible, 8-18 words, no guesses about dish names you cannot see>", "tags": ["<3-6 short tags like pasta, dessert, seafood, hands, plating, buffet, logo>"], "quality": "good"|"ok"|"poor", "text_overlay": <true if a logo or text is printed on the photo>}.
Rules: "chef" means only the chef is recognisable (a man in chef jacket/apron/cap, or only hands); "guests" means any other person or face is visible, even partially; when unsure choose "guests". "poor" means blurry, dark, tiny or a screenshot.
Output ONLY the JSON array, no prose, no code fence.`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = spawnSync("claude", ["-p", prompt, "--allowedTools", "Read", "--output-format", "json", "--model", values.model], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    if (res.status !== 0) {
      console.error(`claude exited ${res.status}: ${res.stderr.slice(0, 500)}`);
      continue;
    }
    try {
      const envelope = JSON.parse(res.stdout) as { result?: string; is_error?: boolean };
      const text = envelope.result ?? "";
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const parsed = Sheet.parse(JSON.parse(text.slice(start, end + 1)));
      const got = new Set(parsed.map((e) => e.index));
      const missing = expected.filter((i) => !got.has(i));
      if (missing.length > 0) throw new Error(`missing indexes ${missing.join(", ")}`);
      return parsed;
    } catch (e) {
      console.error(`attempt ${attempt} on ${path.basename(sheetPath)} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error(`could not catalogue ${sheetPath}`);
};

let added = 0;
sheets.forEach((sheet, n) => {
  const perSheet = Number(values["per-sheet"]);
  const expected = index.slice(n * perSheet, (n + 1) * perSheet);
  const todo = expected.filter((e) => values.force || !catalog[e.name]);
  if (todo.length === 0) {
    console.log(`${sheet}: all ${expected.length} already catalogued`);
    return;
  }
  console.log(`${sheet}: asking ${values.model} about ${expected.length} photos`);
  const entries = ask(path.join(work, sheet), expected.map((e) => e.index));
  for (const entry of entries) {
    const name = index.find((e) => e.index === entry.index)?.name;
    if (!name) continue;
    catalog[name] = { ...entry, source: path.join(src, name), cataloguedAt: new Date().toISOString().slice(0, 10) };
    added++;
  }
  writeFileSync(values.out, JSON.stringify(catalog, null, 2) + "\n");
});
const all = Object.values(catalog);
const count = (k: string) => all.filter((e) => e.people === k).length;
console.log(`catalogue: ${all.length} photos (${added} new) -> ${values.out}; people none=${count("none")} chef=${count("chef")} guests=${count("guests")}`);
