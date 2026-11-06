/** Minimal RFC 4180 CSV reader/writer (quotes, escaped quotes, newlines inside quotes). */

export type CsvRow = Record<string, string>;

export const parseCsv = (text: string): { headers: string[]; rows: CsvRow[] } => {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  if (inQuotes) throw new Error("unterminated quoted field");
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headers, ...body] = nonEmpty;
  const rows = body.map((r, idx) => {
    if (r.length !== headers.length) {
      throw new Error(`row ${idx + 2} has ${r.length} fields, expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
  return { headers, rows };
};

/** Neutralise spreadsheet formula injection: a cell starting with = + - @ tab or CR gets a leading apostrophe (plain numbers are left alone). */
const defuse = (v: string): string => (/^[=+@\t\r]/.test(v) || (/^-/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) ? `'${v}` : v);

const quote = (raw: string): string => {
  const v = defuse(raw);
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export const stringifyCsv = (headers: string[], rows: CsvRow[]): string =>
  [headers.join(","), ...rows.map((r) => headers.map((h) => quote(r[h] ?? "")).join(","))].join("\n") + "\n";
