/**
 * Record a permitted public creative reference in data/references.csv (manual, compliant import).
 *
 *   node scripts/add-reference.ts --url <post url> --platform instagram --format reel \
 *     --hook-type promise --narrative process --pattern "numbered steps with ingredient close-ups" \
 *     [--handle @x] [--posted 2026-10-01] [--duration 18] [--lang en] [--hook-text "..."] [--cta "..."] \
 *     [--views N] [--likes N] [--comments N] [--shares N] [--saves N] [--why "..."] [--notes "..."] \
 *     [--method manual|platform_export|official_api] [--permission public_post_viewed_manually|own_account_export|creator_consent|tiktok_creative_center]
 *
 * Only figures visible on the post to a logged-in human are allowed; leave the rest empty.
 */
import { parseArgs } from "node:util";
import { nextId, readReferences, writeReferences } from "../src/lib/data.ts";
import { ReferenceRow } from "../src/schemas/reference.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    platform: { type: "string" },
    format: { type: "string" },
    "hook-type": { type: "string" },
    narrative: { type: "string" },
    pattern: { type: "string" },
    handle: { type: "string", default: "" },
    posted: { type: "string", default: "" },
    duration: { type: "string", default: "" },
    lang: { type: "string", default: "" },
    "hook-text": { type: "string", default: "" },
    cta: { type: "string", default: "" },
    views: { type: "string", default: "" },
    likes: { type: "string", default: "" },
    comments: { type: "string", default: "" },
    shares: { type: "string", default: "" },
    saves: { type: "string", default: "" },
    why: { type: "string", default: "" },
    notes: { type: "string", default: "" },
    method: { type: "string", default: "manual" },
    permission: { type: "string", default: "public_post_viewed_manually" },
  },
});

const current = readReferences();
if (current.issues.length) {
  for (const i of current.issues) console.error(`${i.file}:${i.row}: ${i.message}`);
  process.exit(1);
}
const candidate = {
  reference_id: nextId("REF", current.raw.map((r) => r.reference_id)),
  collected_at: new Date().toISOString().slice(0, 10),
  collection_method: values.method,
  permission_basis: values.permission,
  source_platform: values.platform,
  source_url: values.url,
  creator_handle: values.handle,
  posted_at: values.posted,
  format: values.format,
  duration_sec: values.duration,
  language: values.lang,
  hook_type: values["hook-type"],
  hook_text: values["hook-text"],
  narrative_structure: values.narrative,
  cta: values.cta,
  creative_pattern: values.pattern,
  views: values.views,
  likes: values.likes,
  comments: values.comments,
  shares: values.shares,
  saves: values.saves,
  why_it_matters: values.why,
  notes: values.notes,
};
const parsed = ReferenceRow.safeParse(candidate);
if (!parsed.success) {
  console.error("invalid reference:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(2);
}
if (current.raw.some((r) => r.source_url === candidate.source_url)) {
  console.error(`already recorded: ${candidate.source_url}`);
  process.exit(2);
}
writeReferences([...current.raw, candidate as unknown as Record<string, string>]);
console.log(`added ${candidate.reference_id} to data/references.csv`);
