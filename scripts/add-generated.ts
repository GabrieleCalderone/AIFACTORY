/**
 * Records a clip made by a generative model from an approved context picture, so reels may
 * use it as moving context (never the house's food, table, kitchen or people).
 *
 *   node scripts/add-generated.ts --source <context id> --file <clip.mp4> --model <model id> --job <job id> --prompt "<prompt>"
 *
 * The clip is copied to public/assets/generated/ with a provenance record next to it and a
 * row in manifest.json. The credit of the source photograph is carried over: an animation of
 * a licensed photograph still owes its author.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { sanitizeText } from "../src/lib/review.ts";

const { values } = parseArgs({ options: { source: { type: "string" }, file: { type: "string" }, model: { type: "string" }, job: { type: "string", default: "" }, prompt: { type: "string", default: "" } } });
const DIR = "public/assets/generated";
const registry = JSON.parse(readFileSync("data/context-registry.json", "utf8")) as Record<string, { status: string; credit: string | null; pageUrl: string; licence: string; review?: { people?: string; subject?: string } }>;
const entry = values.source ? registry[values.source] : undefined;
if (!entry || !values.file || !values.model || !/^[A-Za-z0-9._-]{1,60}$/.test(values.model) || !/^[A-Za-z0-9-]{1,40}$/.test(values.source!)) {
  console.error("usage: node scripts/add-generated.ts --source <context id> --file <clip.mp4> --model <model id> [--job <id>] [--prompt <text>]");
  process.exit(2);
}
// Only a picture a person approved, with a recorded verdict that it shows no people, may be animated into the library.
if (entry.status !== "approved" || entry.review?.people !== "none") {
  console.error(`[generated] ${values.source}: the source must be an approved context picture with no people (it is ${entry.status})`);
  process.exit(1);
}
if (!existsSync(values.file) || !/\.mp4$/i.test(values.file)) {
  console.error("[generated] --file must be an existing .mp4");
  process.exit(2);
}
const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", values.file], { encoding: "utf8" })) as { streams: { codec_name: string; width: number; height: number }[]; format: { duration: string } };
const video = probe.streams[0];
if (!video || video.codec_name !== "h264" || Number(probe.format.duration) > 12) {
  console.error("[generated] the clip must be H.264 video of at most 12 seconds");
  process.exit(1);
}
mkdirSync(DIR, { recursive: true });
const name = `${values.source}-${values.model.replace(/[^A-Za-z0-9]+/g, "-")}.mp4`;
copyFileSync(values.file, path.join(DIR, name));
const row = { file: name, width: video.width, height: video.height, durationSec: Math.round(Number(probe.format.duration) * 10) / 10, people: "none", subject: sanitizeText(entry.review?.subject ?? "", 100), credit: entry.credit, source: entry.pageUrl, model: values.model };
writeFileSync(path.join(DIR, `${name}.provenance.json`), JSON.stringify({ operation: "generated", service: "Higgsfield", model: values.model, job: sanitizeText(values.job, 60), prompt: sanitizeText(values.prompt, 400), sourcePicture: values.source, sourceLicence: entry.licence, credit: entry.credit, madeAt: new Date().toISOString() }, null, 2) + "\n");
const manifestPath = path.join(DIR, "manifest.json");
const rows = (existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { file: string }[]) : []).filter((r) => r.file !== name);
writeFileSync(manifestPath, JSON.stringify([...rows, row], null, 2) + "\n");
console.log(`[generated] ${DIR}/${name}: ${row.width}x${row.height}, ${row.durationSec}s, credit ${row.credit ?? "none owed"}`);
