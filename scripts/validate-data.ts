/** Validate data/experiments.csv and data/references.csv against their schemas. Exit 1 on any issue. */
import { readExperiments, readReferences } from "../src/lib/data.ts";

const e = readExperiments();
const r = readReferences();
const issues = [...e.issues, ...r.issues];
console.log(`experiments: ${e.records.length} valid rows; references: ${r.records.length} valid rows`);
for (const i of issues) console.error(`${i.file}:${i.row}: ${i.message}`);
process.exit(issues.length === 0 ? 0 : 1);
