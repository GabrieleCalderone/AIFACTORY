/**
 * One autopilot cycle: sync metrics -> report -> if a post is due: author -> render -> host ->
 * publish -> advance state. Idempotent and safe to run daily (launchd). Without Buffer keys
 * everything runs except the network publish (dry run), so drafts and renders still accumulate.
 *
 *   node --env-file-if-exists=.env scripts/autopilot.ts [--force] [--dry-run] [--model sonnet]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { readExperiments } from "../src/lib/data.ts";
import { advance, defaultState, isDue, nextSlot, planNext, type AutopilotState } from "../src/lib/autopilot.ts";
import { loadPipeline } from "../src/lib/pipeline-io.ts";

const { values } = parseArgs({ options: { force: { type: "boolean", default: false }, "dry-run": { type: "boolean", default: false }, model: { type: "string", default: "sonnet" } } });
mkdirSync("logs", { recursive: true });
const localDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const logFile = path.join("logs", `autopilot-${localDay(new Date())}.log`);
const jsonLog = path.join("logs", "autopilot.jsonl");
const log = (msg: string, fields: Record<string, unknown> = {}) => {
  const at = new Date().toISOString();
  const line = `${at} ${msg}`;
  console.log(line);
  writeFileSync(logFile, line + "\n", { flag: "a" });
  writeFileSync(jsonLog, JSON.stringify({ at, level: /FAILED|ERROR/.test(msg) ? "error" : /warning/.test(msg) ? "warn" : "info", msg, ...fields }) + "\n", { flag: "a" });
};
const run = (label: string, args: string[], env: Record<string, string> = {}) => {
  log(`$ node ${args.join(" ")}`);
  const res = spawnSync("node", ["--env-file-if-exists=.env", ...args], { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 50 * 1024 * 1024 });
  const out = `${res.stdout}${res.stderr}`.trim();
  if (out) writeFileSync(logFile, out + "\n", { flag: "a" });
  if (res.status !== 0) throw new Error(`${label} failed (exit ${res.status}): ${out.split("\n").slice(-5).join(" | ")}`);
  return res.stdout;
};

const statePath = "data/autopilot.json";
const state: AutopilotState = existsSync(statePath) ? { ...defaultState, ...(JSON.parse(readFileSync(statePath, "utf8")) as Partial<AutopilotState>) } : defaultState;
const now = new Date();
log(`autopilot start (dry-run=${values["dry-run"]}, force=${values.force})`);

if (existsSync("STOP")) {
  log("STOP file present: autopilot paused (delete STOP to resume)");
  process.exit(0);
}
try {
  run("metrics", ["scripts/sync-metrics.ts"]);
} catch (e) {
  log(`warning: ${e instanceof Error ? e.message : e}`);
}
try {
  run("validate", ["scripts/validate-data.ts"]);
} catch (e) {
  log(`FAILED before authoring: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
try {
  run("report", ["scripts/report.ts"]);
} catch (e) {
  log(`warning: ${e instanceof Error ? e.message : e}`);
}

if (!values.force && !isDue(state, now)) {
  log(`not due: last post ${state.lastPostAt}, cadence ${state.cadenceDays} days`);
  process.exit(0);
}

const experiments = readExperiments().records.map((r) => ({ experiment_id: r.experiment_id, variant_id: r.variant_id, archetype: r.archetype, status: r.status }));
const plan = planNext(state, experiments);
const slug = `${plan.archetype.slice(0, 2).toLowerCase()}-${now.toISOString().slice(0, 10).replace(/-/g, "")}${plan.variantId === "A" ? "" : `-${plan.variantId.toLowerCase()}`}`;
const specFile = path.join("content/posts", `${slug}.json`);
log(`plan: ${plan.archetype} ${plan.lang} ${plan.experimentId}/${plan.variantId} (${plan.reason}) -> ${slug}`);

try {
  if (!existsSync(specFile)) {
    run("author", ["scripts/author.ts", "--archetype", plan.archetype, "--lang", plan.lang, "--experiment", plan.experimentId, "--variant", plan.variantId, "--slug", slug, "--model", values.model]);
  } else {
    log(`spec exists, reusing ${specFile}`);
  }
  run("render", ["scripts/render.ts", specFile, "--qa"]);
  run("storyboard", ["scripts/storyboard.ts", specFile]);
  const hostArgs = ["scripts/host-media.ts", specFile];
  if (values["dry-run"]) hostArgs.push("--dry-run");
  run("host", hostArgs);
  const when = nextSlot(state, now).toISOString();
  const approved = loadPipeline()[slug]?.state === "APPROVED" || process.env.AUTOPUBLISH === "true";
  if (approved || values["dry-run"]) {
    const publishArgs = ["scripts/publish.ts", specFile, "--when", when];
    if (values["dry-run"]) publishArgs.push("--dry-run");
    run("publish", publishArgs);
  } else {
    log(`${slug} is READY and waits for approval in the console (set AUTOPUBLISH=true after the first validated publish to skip this step)`);
  }
  const next = advance(state, now);
  writeFileSync(statePath, JSON.stringify(next, null, 2) + "\n");
  log(`done: ${slug} ${approved ? `scheduled for ${when}` : "produced, awaiting approval"}; next archetype ${next.rotation[next.nextIndex]}`);
} catch (e) {
  log(`FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
