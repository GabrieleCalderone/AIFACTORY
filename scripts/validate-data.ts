/** Validate data/experiments.csv and data/references.csv against their schemas, and the rotation against the editorial calendar of the house standard. Exit 1 on any issue. */
import { existsSync, readFileSync } from "node:fs";
import { calendarIssues, defaultState, type ArchetypeLite, type AutopilotState } from "../src/lib/autopilot.ts";
import { readExperiments, readReferences } from "../src/lib/data.ts";
import { loadStandard } from "../src/lib/gate-io.ts";

const e = readExperiments();
const r = readReferences();
const issues = [...e.issues, ...r.issues];
console.log(`experiments: ${e.records.length} valid rows; references: ${r.records.length} valid rows`);
for (const i of issues) console.error(`${i.file}:${i.row}: ${i.message}`);
const calendar = loadStandard()?.calendar;
let calendarProblems: string[] = [];
if (calendar) {
  const archetypes = (JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: ArchetypeLite[] }).archetypes;
  const state = existsSync("data/autopilot.json") ? (JSON.parse(readFileSync("data/autopilot.json", "utf8")) as AutopilotState) : defaultState;
  calendarProblems = [...new Set([...calendarIssues(state.rotation, archetypes, calendar), ...calendarIssues(defaultState.rotation, archetypes, calendar)])];
  console.log(`calendar: ${state.rotation.length} slots, ${calendarProblems.length} issue(s)`);
  for (const c of calendarProblems) console.error(`editorial calendar: ${c}`);
}
process.exit(issues.length + calendarProblems.length === 0 ? 0 : 1);
