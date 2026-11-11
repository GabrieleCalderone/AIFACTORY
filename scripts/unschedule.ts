/**
 * Takes a post back from the Buffer queue: deletes every publication of the slug that has
 * not gone out yet, drops those rows from data/publications.json and marks the post REJECTED.
 * A publication that was already sent is left alone and reported.
 *
 *   node --env-file-if-exists=.env scripts/unschedule.ts <slug> --reason "why" [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createBufferClient } from "../src/adapters/buffer.ts";
import { setState } from "../src/lib/pipeline-io.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { reason: { type: "string" }, "dry-run": { type: "boolean", default: false } } });
const slug = positionals[0];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !values.reason) {
  console.error('usage: node --env-file-if-exists=.env scripts/unschedule.ts <slug> --reason "why" [--dry-run]');
  process.exit(2);
}
type Pub = { slug: string; kind: string; platform?: string; bufferPostId?: string; dueAt?: string };
const file = "data/publications.json";
const pubs = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Pub[]) : [];
const mine = pubs.filter((p) => p.slug === slug && p.bufferPostId);
if (!mine.length) {
  console.log(`[unschedule] ${slug}: nothing on Buffer`);
  process.exit(0);
}
const client = createBufferClient({ apiKey: process.env.BUFFER_API_KEY ?? "" });
const removed: Pub[] = [];
const kept: string[] = [];
for (const pub of mine) {
  const label = `${pub.platform ?? "instagram"} ${pub.kind} due ${pub.dueAt ?? "?"}`;
  const { status } = await client.postMetrics(pub.bufferPostId!);
  if (status === "sent") {
    kept.push(label);
    console.log(`[unschedule] ${slug}: ${label} was already published, left as it is`);
    continue;
  }
  if (values["dry-run"]) {
    console.log(`[unschedule] ${slug}: would delete ${label} (status ${status ?? "unknown"})`);
    continue;
  }
  await client.deletePost(pub.bufferPostId!);
  removed.push(pub);
  console.log(`[unschedule] ${slug}: deleted ${label}`);
}
if (removed.length) {
  writeFileSync(file, JSON.stringify(pubs.filter((p) => !removed.includes(p)), null, 2) + "\n");
  if (!kept.length) setState(slug, "REJECTED", `taken back from Buffer (${removed.map((p) => `${p.platform ?? "instagram"} ${p.kind}`).join(", ")}): ${values.reason}`);
}
if (kept.length) process.exit(1);
