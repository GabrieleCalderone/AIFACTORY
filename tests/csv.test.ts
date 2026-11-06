import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, stringifyCsv } from "../src/lib/csv.ts";

test("parseCsv handles quotes, escaped quotes and newlines inside quotes", () => {
  const text = 'a,b,c\n1,"x, y","say ""hi""\nline2"\n';
  const { headers, rows } = parseCsv(text);
  assert.deepEqual(headers, ["a", "b", "c"]);
  assert.deepEqual(rows, [{ a: "1", b: "x, y", c: 'say "hi"\nline2' }]);
});

test("parseCsv rejects rows with the wrong number of fields", () => {
  assert.throws(() => parseCsv("a,b\n1,2,3\n"), /row 2 has 3 fields/);
});

test("stringifyCsv round-trips through parseCsv", () => {
  const headers = ["id", "text"];
  const rows = [{ id: "1", text: 'comma, quote " and\nnewline' }];
  const out = stringifyCsv(headers, rows);
  assert.deepEqual(parseCsv(out).rows, rows);
});

test("cells that look like spreadsheet formulas are defused on write", () => {
  const out = stringifyCsv(["a", "b", "c", "d"], [{ a: "=SUM(1)", b: "-5", c: "-not a number", d: "+39 340" }]);
  assert.equal(out, "a,b,c,d\n'=SUM(1),-5,'-not a number,'+39 340\n");
});
