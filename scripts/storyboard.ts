/**
 * Storyboard for approval before rendering: brief, beats with thumbnails, texts, timings,
 * carousel slides and caption, as HTML (openable on the Mac) and Markdown (pasteable).
 *
 *   node scripts/storyboard.ts content/posts/<slug>.json [--out out/<slug>]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { REEL } from "../src/lib/formats.ts";
import { buildCaption, reelTimeline } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/storyboard.ts content/posts/<slug>.json [--out dir]");
  process.exit(2);
}
const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
const outDir = values.out ?? path.join("out", spec.slug);
mkdirSync(outDir, { recursive: true });
const rel = (publicPath: string) => path.relative(outDir, path.join("public", publicPath));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const md: string[] = [`# Storyboard: ${spec.title}`, "", `Spec: \`${file}\` · slug \`${spec.slug}\` · ${spec.lang.toUpperCase()} · archetype ${spec.brief.archetype} · ${spec.brief.experimentId ?? "no experiment"}/${spec.brief.variantId ?? "-"}`, "", "## Brief", ""];
md.push(`- **Audience:** ${spec.brief.audience}`, `- **Objective:** ${spec.brief.objective}`, `- **Hook:** ${spec.brief.hook}`, `- **CTA:** ${spec.brief.cta}`);
if (spec.brief.hypothesis) md.push(`- **Hypothesis:** ${spec.brief.hypothesis}`);
md.push("", "Sequence:", ...spec.brief.sequence.map((b, i) => `${i + 1}. ${b}`), "");

const html: string[] = [`<!doctype html><html lang="${spec.lang}"><head><meta charset="utf-8"><title>Storyboard ${esc(spec.slug)}</title><style>body{font:15px/1.45 -apple-system,Helvetica,Arial,sans-serif;margin:32px;color:#1a1a1a;max-width:1200px}h1,h2{font-family:Georgia,serif}table{border-collapse:collapse;width:100%;margin:12px 0 28px}th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}th{background:#f5f1ea}img{height:180px;border-radius:4px;background:#222}code{background:#f3f3f3;padding:1px 4px}pre{white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:6px}.meta{color:#666}</style></head><body>`];
html.push(`<h1>${esc(spec.title)}</h1><p class="meta">${esc(file)} · ${spec.lang.toUpperCase()} · ${esc(spec.brief.archetype)} · ${esc(spec.brief.experimentId ?? "no experiment")}/${esc(spec.brief.variantId ?? "-")}</p>`);
html.push(`<h2>Brief</h2><table><tr><th>Audience</th><td>${esc(spec.brief.audience)}</td></tr><tr><th>Objective</th><td>${esc(spec.brief.objective)}</td></tr><tr><th>Hook</th><td>${esc(spec.brief.hook)}</td></tr><tr><th>CTA</th><td>${esc(spec.brief.cta)}</td></tr><tr><th>Hypothesis</th><td>${esc(spec.brief.hypothesis ?? "")}</td></tr><tr><th>Sequence</th><td><ol>${spec.brief.sequence.map((b) => `<li>${esc(b)}</li>`).join("")}</ol></td></tr></table>`);

if (spec.reel) {
  const tl = reelTimeline(spec.reel, REEL.fps);
  md.push(`## Reel (${(tl.totalInFrames / REEL.fps).toFixed(1)} s, ${tl.sequences.length} beats, ${spec.reel.transitionSec} s fades)`, "", "| # | Media | Label | Text | Seconds | Move |", "|---|---|---|---|---|---|");
  html.push(`<h2>Reel · ${(tl.totalInFrames / REEL.fps).toFixed(1)} s · 1080x1920</h2><table><tr><th>#</th><th>Media</th><th>Label</th><th>Text</th><th>s</th><th>Move</th></tr>`);
  const beats = [
    { label: "HOOK", text: `${spec.reel.hook.title}${spec.reel.hook.subtitle ? ` / ${spec.reel.hook.subtitle}` : ""}`, media: spec.reel.hook.video ?? spec.reel.hook.image ?? "", sec: spec.reel.hook.durationSec, motion: spec.reel.hook.video ? "clip" : spec.reel.hook.motion },
    ...spec.reel.scenes.map((s) => ({ label: s.label ?? "", text: s.text ?? "", media: s.video ?? s.image ?? "", sec: s.durationSec, motion: s.video ? "clip" : s.motion })),
    { label: "CTA", text: `${spec.reel.cta.title}${spec.reel.cta.line ? ` / ${spec.reel.cta.line}` : ""}`, media: "", sec: spec.reel.cta.durationSec, motion: "card" },
  ];
  beats.forEach((b, i) => {
    md.push(`| ${i + 1} | ${b.media || "(brand card)"} | ${b.label} | ${b.text} | ${b.sec} | ${b.motion} |`);
    const thumb = b.media && !/\.(mp4|mov|webm)$/i.test(b.media) ? `<img src="${esc(rel(b.media))}" alt="">` : b.media ? `<code>${esc(b.media)}</code>` : "<em>brand card</em>";
    html.push(`<tr><td>${i + 1}</td><td>${thumb}<br><code>${esc(b.media)}</code></td><td>${esc(b.label)}</td><td>${esc(b.text)}</td><td>${b.sec}</td><td>${esc(b.motion)}</td></tr>`);
  });
  md.push("");
  html.push("</table>");
}
if (spec.carousel) {
  md.push(`## Carousel (${spec.carousel.slides.length} slides, 1080x1350)`, "", "| # | Type | Image | Title | Body |", "|---|---|---|---|---|");
  html.push(`<h2>Carousel · ${spec.carousel.slides.length} slides · 1080x1350</h2><table><tr><th>#</th><th>Type</th><th>Image</th><th>Title</th><th>Body</th></tr>`);
  spec.carousel.slides.forEach((s, i) => {
    const image = "image" in s && s.image ? s.image : "";
    const title = "title" in s ? s.title ?? "" : "";
    const body = "body" in s ? s.body ?? "" : "kicker" in s ? s.kicker ?? "" : "";
    md.push(`| ${i + 1} | ${s.type} | ${image} | ${title} | ${body} |`);
    html.push(`<tr><td>${i + 1}</td><td>${s.type}</td><td>${image ? `<img src="${esc(rel(image))}" alt=""><br><code>${esc(image)}</code>` : ""}</td><td>${esc(title)}</td><td>${esc(body)}</td></tr>`);
  });
  md.push("");
  html.push("</table>");
}
const caption = buildCaption(spec);
md.push("## Caption", "", "```", caption, "```", "");
html.push(`<h2>Caption</h2><pre>${esc(caption)}</pre></body></html>`);
writeFileSync(path.join(outDir, "storyboard.md"), md.join("\n"));
writeFileSync(path.join(outDir, "storyboard.html"), html.join("\n"));
console.log(`wrote ${path.join(outDir, "storyboard.html")} and storyboard.md`);
