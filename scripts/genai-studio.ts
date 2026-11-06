/**
 * Higgsfield Generative Studio, REAL-FIRST and budget-gated.
 *
 *   node --env-file-if-exists=.env scripts/genai-studio.ts --model higgsfield-ai/soul/v2/standard --prompt "..." [--image-url https://...] [--run] [--note "..."]
 *
 * Always: estimate the cost. With --run: check the monthly cap (GENAI_MONTHLY_CAP_EUR) against the
 * ledger data/genai-spend.json, submit, poll, download outputs into public/assets/generated/,
 * write a provenance sidecar (model, prompt, inputs, request id, cost, licence, synthetic=true)
 * and index them in the media registry. Never represents synthetic media as a real photo.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  canSpend,
  createHiggsfieldClient,
  type Provenance,
  type SpendEntry,
} from "../src/adapters/higgsfield.ts";
import { budgetPolicy } from "../src/adapters/genai.ts";
import {
  emptyRegistry,
  upsertAsset,
  type Registry,
} from "../src/lib/registry.ts";

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "higgsfield-ai/soul/v2/standard" },
    prompt: { type: "string", default: "" },
    "image-url": { type: "string" },
    run: { type: "boolean", default: false },
    note: { type: "string", default: "" },
    "max-concurrent": { type: "string", default: "1" },
  },
});
if (!values.prompt.trim()) {
  console.error(
    "usage: node scripts/genai-studio.ts --model <path> --prompt <text> [--image-url <public url>] [--run]",
  );
  process.exit(2);
}
const keyId = process.env.HF_API_KEY_ID;
const keySecret = process.env.HF_API_KEY_SECRET;
const policy = budgetPolicy(process.env);
console.log(
  `[studio] budget: approved EUR ${policy.approvedEur}/month (ceiling ${policy.ceilingEur})`,
);
if (!keyId || !keySecret) {
  console.log(
    "[studio] no HF_API_KEY_ID/HF_API_KEY_SECRET: dry run, nothing called. Keys come from open.higgsfield.ai (API billing is separate from the website plan).",
  );
  process.exit(0);
}
const input: Record<string, unknown> = { prompt: values.prompt };
if (values["image-url"]) {
  const u = new URL(values["image-url"]);
  if (u.protocol !== "https:") throw new Error("--image-url must be https");
  input.image_url = u.href;
}
const outputHosts = (process.env.HF_OUTPUT_HOSTS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const client = createHiggsfieldClient({ keyId, keySecret, ...(outputHosts.length ? { outputHosts } : {}) });
const usd = await client.estimateUsd(values.model, input);
console.log(`[studio] estimate for ${values.model}: USD ${usd.toFixed(3)}`);
const ledgerFile = "data/genai-spend.json";
const ledger: SpendEntry[] = existsSync(ledgerFile)
  ? (JSON.parse(readFileSync(ledgerFile, "utf8")) as SpendEntry[])
  : [];
const budget = canSpend(ledger, usd, policy.approvedEur);
console.log(
  `[studio] budget check: ${budget.ok ? "ok" : "blocked"}: ${budget.reason} (spent this month EUR ${budget.monthEur.toFixed(2)})`,
);
if (!values.run) {
  console.log("[studio] estimate only (pass --run to generate)");
  process.exit(0);
}
if (!budget.ok) process.exit(3);

// Concurrency guard: one running request per process, limited by a simple lock file.
const lock = "data/.genai-running";
const running = existsSync(lock)
  ? Number(readFileSync(lock, "utf8") || "0")
  : 0;
if (running >= Number(values["max-concurrent"])) {
  console.error(
    `[studio] ${running} generation(s) already running; try again later`,
  );
  process.exit(4);
}
writeFileSync(lock, String(running + 1));
try {
  const sub = await client.submit(values.model, input);
  console.log(`[studio] submitted ${sub.requestId} (${sub.status})`);
  ledger.push({
    at: new Date().toISOString(),
    model: values.model,
    usd,
    requestId: sub.requestId,
    note: values.note,
  });
  writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  const result = await client.waitFor(sub.statusUrl, {
    intervalMs: 5000,
    timeoutMs: 15 * 60 * 1000,
  });
  if (result.status !== "completed") {
    console.error(
      `[studio] request ended as ${result.status} (failed/nsfw requests are not charged by Higgsfield; ledger keeps the estimate until reconciled)`,
    );
    process.exit(1);
  }
  if (result.rejected.length) console.warn(`[studio] ${result.rejected.length} output URL(s) ignored because their host is not allowed (set HF_OUTPUT_HOSTS to add the CDN host): ${result.rejected.map((u) => new URL(u).host).join(", ")}`);
  const outDir = path.resolve("public/assets/generated");
  mkdirSync(outDir, { recursive: true });
  const rid = (sub.requestId.match(/[A-Za-z0-9]+/)?.[0] ?? "req").slice(0, 8);
  const regFile = "data/media-registry.json";
  const reg: Registry = existsSync(regFile)
    ? (JSON.parse(readFileSync(regFile, "utf8")) as Registry)
    : emptyRegistry();
  let i = 0;
  for (const url of result.outputs) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[studio] download failed ${res.status} for ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (
      new URL(url).pathname.match(/\.(png|jpe?g|webp|mp4|mov|webm)$/i)?.[1] ??
      "bin"
    ).toLowerCase();
    const file = path.join(
      "public/assets/generated",
      `${new Date().toISOString().slice(0, 10)}-${sub.requestId.slice(0, 8)}-${++i}.${ext}`,
    );
    writeFileSync(file, buf);
    const provenance: Provenance = {
      kind: "generated",
      provider: "higgsfield",
      model: values.model,
      prompt: values.prompt,
      inputAssets: values["image-url"] ? [values["image-url"]] : [],
      requestId: sub.requestId,
      usd,
      createdAt: new Date().toISOString(),
      license: "higgsfield-terms",
      synthetic: true,
    };
    writeFileSync(
      `${file}.provenance.json`,
      JSON.stringify(provenance, null, 2) + "\n",
    );
    upsertAsset(reg, {
      id: createHash("sha256").update(buf).digest("hex"),
      sources: [
        { kind: "generated", path: file, addedAt: provenance.createdAt },
      ],
      mime: ext === "mp4" ? "video/mp4" : `image/${ext}`,
      license: "higgsfield-terms",
      synthetic: true,
      provenance: provenance as unknown as Record<string, unknown>,
      people: "none",
    });
    console.log(
      `[studio] saved ${file} (synthetic, provenance sidecar written)`,
    );
  }
  writeFileSync(regFile, JSON.stringify(reg, null, 1) + "\n");
  console.log(
    `[studio] done: ${i} file(s); USD ${usd.toFixed(3)} recorded in ${ledgerFile}`,
  );
} finally {
  const left = Math.max(
    0,
    (existsSync(lock) ? Number(readFileSync(lock, "utf8") || "1") : 1) - 1,
  );
  writeFileSync(lock, String(left));
}
