/**
 * Host and schedule one already-rendered post at the next posting slot (used by the console
 * "Pubblica" button and for the backlog once Buffer is connected).
 *
 *   node --env-file-if-exists=.env scripts/publish-post.ts content/posts/<slug>.json [--dry-run]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { defaultState, nextSlot, type AutopilotState } from "../src/lib/autopilot.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { "dry-run": { type: "boolean", default: false } } });
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/publish-post.ts content/posts/<slug>.json [--dry-run]");
  process.exit(2);
}
const state: AutopilotState = existsSync("data/autopilot.json") ? { ...defaultState, ...(JSON.parse(readFileSync("data/autopilot.json", "utf8")) as Partial<AutopilotState>) } : defaultState;
const run = (args: string[]) => {
  const res = spawnSync("node", ["--env-file-if-exists=.env", ...args], { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
};
run(["scripts/host-media.ts", file, ...(values["dry-run"] ? ["--dry-run"] : [])]);
run(["scripts/publish.ts", file, "--when", nextSlot(state, new Date()).toISOString(), ...(values["dry-run"] ? ["--dry-run"] : [])]);
