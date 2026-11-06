import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseCsv, stringifyCsv, type CsvRow } from "./csv.ts";
import { EXPERIMENT_COLUMNS, ExperimentRow } from "../schemas/experiment.ts";
import { REFERENCE_COLUMNS, ReferenceRow } from "../schemas/reference.ts";

export const EXPERIMENTS_CSV = "data/experiments.csv";
export const REFERENCES_CSV = "data/references.csv";

export type Issue = { file: string; row: number; message: string };

const validateRows = <T>(file: string, rows: CsvRow[], headers: string[], expected: readonly string[], parse: (r: CsvRow) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }) => {
  const issues: Issue[] = [];
  const missing = expected.filter((c) => !headers.includes(c));
  const extra = headers.filter((c) => !expected.includes(c));
  if (missing.length || extra.length) {
    issues.push({ file, row: 1, message: `header mismatch; missing: [${missing.join(", ")}] extra: [${extra.join(", ")}]` });
    return { records: [] as T[], issues };
  }
  const records: T[] = [];
  rows.forEach((r, i) => {
    const res = parse(r);
    if (res.success) records.push(res.data);
    else res.error.issues.forEach((iss) => issues.push({ file, row: i + 2, message: `${iss.path.map(String).join(".")}: ${iss.message}` }));
  });
  return { records, issues };
};

export const readExperiments = (file = EXPERIMENTS_CSV) => {
  const { headers, rows } = parseCsv(readFileSync(file, "utf8"));
  return { ...validateRows(file, rows, headers, EXPERIMENT_COLUMNS, (r) => ExperimentRow.safeParse(r)), raw: rows, headers };
};

export const readReferences = (file = REFERENCES_CSV) => {
  if (!existsSync(file)) return { records: [] as ReferenceRow[], issues: [] as Issue[], raw: [] as CsvRow[], headers: [...REFERENCE_COLUMNS] as string[] };
  const { headers, rows } = parseCsv(readFileSync(file, "utf8"));
  return { ...validateRows(file, rows, headers, REFERENCE_COLUMNS, (r) => ReferenceRow.safeParse(r)), raw: rows, headers };
};

const cell = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

export const writeExperiments = (rows: CsvRow[], file = EXPERIMENTS_CSV) =>
  writeFileSync(file, stringifyCsv([...EXPERIMENT_COLUMNS], rows.map((r) => Object.fromEntries(EXPERIMENT_COLUMNS.map((c) => [c, cell(r[c])])))));

export const writeReferences = (rows: CsvRow[], file = REFERENCES_CSV) =>
  writeFileSync(file, stringifyCsv([...REFERENCE_COLUMNS], rows.map((r) => Object.fromEntries(REFERENCE_COLUMNS.map((c) => [c, cell(r[c])])))));

export const nextId = (prefix: string, ids: string[]): string => {
  const max = ids.reduce((m, id) => {
    const n = Number(id.replace(`${prefix}-`, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
};
