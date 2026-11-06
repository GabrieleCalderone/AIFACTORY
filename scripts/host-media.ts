/**
 * Copy a rendered post's media into the public GitHub Pages repo so Buffer/Meta can
 * fetch them by URL, commit and push, write out/<slug>/hosted.json with the public URLs
 * and wait until they answer HTTP 200. The repo is created once by
 * scripts/setup-media-host.sh (public repo: everything pushed here is visible to anyone).
 *
 *   node scripts/host-media.ts content/posts/<slug>.json [--repo-dir ~/Projects/risthome-media] [--base https://<user>.github.io/risthome-media] [--no-wait] [--dry-run]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { parsePostSpec } from "../src/schemas/post.ts";
import { loadPipeline, setState } from "../src/lib/pipeline-io.ts";
import { createR2Store } from "../src/adapters/r2.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "repo-dir": { type: "string", default: process.env.MEDIA_REPO_DIR ?? path.join(homedir(), "Projects/risthome-media") },
    base: { type: "string", default: process.env.MEDIA_BASE_URL ?? "https://gabrielecalderone.github.io/risthome-media" },
    /** Sub-folder inside the repo (set MEDIA_SUBDIR=media when the code repo itself serves the files via Pages). */
    subdir: { type: "string", default: process.env.MEDIA_SUBDIR ?? "" },
    "no-wait": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    out: { type: "string", default: "out" },
  },
});
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/host-media.ts content/posts/<slug>.json [--dry-run]");
  process.exit(2);
}
const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
const outDir = path.join(values.out, spec.slug);
const manifest = JSON.parse(readFileSync(path.join(outDir, "manifest.json"), "utf8")) as { reel?: { file: string; cover?: string }; carousel?: { file: string }[]; spec: { sha256: string } };
const repoDir = values["repo-dir"];
const version = manifest.spec.sha256.slice(0, 8);
const hosted: { reel?: string; cover?: string; carousel?: string[]; version: string; base: string; dryRun?: boolean } = { version, base: values.base };
const url = (src: string) => `${values.base}/${spec.slug}/${version}/${path.basename(src)}`;
if (manifest.reel) {
  hosted.reel = url(manifest.reel.file);
  if (manifest.reel.cover) hosted.cover = url(manifest.reel.cover);
}
if (manifest.carousel) hosted.carousel = manifest.carousel.map((s) => url(s.file));

if (values["dry-run"]) {
  hosted.dryRun = true;
  writeFileSync(path.join(outDir, "hosted.json"), JSON.stringify(hosted, null, 2) + "\n");
  console.log(`dry run: would host ${(hosted.carousel?.length ?? 0) + (hosted.reel ? 1 : 0) + (hosted.cover ? 1 : 0)} files under ${values.base}/${spec.slug}/${version}/`);
  process.exit(0);
}
// MEDIA_STORE=r2: persistent object storage with public URLs (no git involved).
if ((process.env.MEDIA_STORE ?? "github") === "r2") {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL } = process.env;
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_BASE_URL) {
    console.error("MEDIA_STORE=r2 needs R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL");
    process.exit(1);
  }
  const store = createR2Store({ endpoint: R2_ENDPOINT, bucket: R2_BUCKET, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, publicBaseUrl: R2_PUBLIC_BASE_URL });
  const up = async (file: string) => store.put(`${spec.slug}/${version}/${path.basename(file)}`, readFileSync(file), file.endsWith(".mp4") ? "video/mp4" : "image/jpeg");
  if (manifest.reel) {
    hosted.reel = await up(manifest.reel.file);
    if (manifest.reel.cover) hosted.cover = await up(manifest.reel.cover);
  }
  if (manifest.carousel) hosted.carousel = await Promise.all(manifest.carousel.map((s) => up(s.file)));
  hosted.base = R2_PUBLIC_BASE_URL;
  writeFileSync(path.join(outDir, "hosted.json"), JSON.stringify(hosted, null, 2) + "\n");
  const st = loadPipeline()[spec.slug]?.state;
  if (st && ["RENDERED", "READY", "APPROVED", "FAILED", "BLOCKED"].includes(st)) setState(spec.slug, st === "APPROVED" ? "APPROVED" : "READY", `media on R2 under ${R2_PUBLIC_BASE_URL}/${spec.slug}/${version}/`);
  console.log(`uploaded to R2: ${spec.slug}/${version}/`);
  process.exit(0);
}
if (!existsSync(path.join(repoDir, ".git"))) {
  console.error(`media repo not found at ${repoDir}: run scripts/setup-media-host.sh once (creates the public GitHub Pages repo)`);
  process.exit(1);
}
const target = path.join(repoDir, values.subdir, spec.slug, version);
mkdirSync(target, { recursive: true });
const files = [manifest.reel?.file, manifest.reel?.cover, ...(manifest.carousel ?? []).map((s) => s.file)].filter((f): f is string => Boolean(f));
for (const f of files) copyFileSync(f, path.join(target, path.basename(f)));
const git = (...args: string[]) => execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8" });
// Stage only this post's media folder, never the whole tree, and refuse to commit anything else.
const relTarget = path.relative(repoDir, target);
git("add", "--", relTarget);
const staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
const stray = staged.filter((f) => !f.startsWith(relTarget + "/") && f !== relTarget);
if (stray.length) {
  console.error(`refusing to publish: staged files outside ${relTarget}: ${stray.join(", ")}`);
  process.exit(1);
}
if (staged.length) {
  git("commit", "-qm", `media: ${spec.slug} ${version}`);
  git("push", "-q");
  console.log(`pushed ${spec.slug}/${version} (${files.length} files)`);
} else {
  console.log(`nothing new to push for ${spec.slug}/${version}`);
}
writeFileSync(path.join(outDir, "hosted.json"), JSON.stringify(hosted, null, 2) + "\n");

const urls = [hosted.reel, hosted.cover, ...(hosted.carousel ?? [])].filter((u): u is string => Boolean(u));
if (!values["no-wait"]) {
  const deadline = Date.now() + 8 * 60 * 1000;
  let pending = [...urls];
  while (pending.length && Date.now() < deadline) {
    const results = await Promise.all(pending.map(async (u) => ({ u, ok: await fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false) })));
    pending = results.filter((r) => !r.ok).map((r) => r.u);
    if (pending.length) await new Promise((r) => setTimeout(r, 15000));
  }
  if (pending.length) {
    console.error(`still not public after 8 min: ${pending.join(", ")}`);
    process.exit(1);
  }
  console.log(`${urls.length} files public under ${values.base}/${spec.slug}/${version}/`);
  const st = loadPipeline()[spec.slug]?.state;
  if (st && ["RENDERED", "READY", "APPROVED", "FAILED", "BLOCKED"].includes(st)) setState(spec.slug, st === "APPROVED" ? "APPROVED" : "READY", `media public at ${values.base}/${spec.slug}/${version}/`);
}
