/**
 * Quality gate without rendering: TODO texts, missing media, unknown archetype, reel length,
 * upscaling, consent, experiment row. Exit 1 on errors (or on warnings with --strict).
 *
 *   node scripts/gate.ts content/posts/<slug>.json [--strict]
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gateSpec } from "../src/lib/gate-io.ts";
import { parsePostSpec } from "../src/schemas/post.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { strict: { type: "boolean", default: false } } });
if (positionals.length === 0) {
  console.error("usage: node scripts/gate.ts content/posts/<slug>.json [--strict]");
  process.exit(2);
}
let failed = false;
for (const file of positionals) {
  const spec = parsePostSpec(JSON.parse(readFileSync(file, "utf8")));
  const { errors, warnings } = gateSpec(spec);
  errors.forEach((e) => console.error(`[gate] ${spec.slug}: ERROR ${e}`));
  warnings.forEach((w) => console.warn(`[gate] ${spec.slug}: warning ${w}`));
  const ok = errors.length === 0 && (!values.strict || warnings.length === 0);
  console.log(`[gate] ${spec.slug}: ${ok ? "PASS" : "FAIL"} (${errors.length} errors, ${warnings.length} warnings)`);
  failed ||= !ok;
}
process.exit(failed ? 1 : 0);
