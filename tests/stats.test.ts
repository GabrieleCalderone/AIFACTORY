import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRates, verdict, wilson } from "../src/lib/stats.ts";

test("wilson interval contains the rate and narrows with more data", () => {
  const a = wilson(5, 100);
  const b = wilson(50, 1000);
  assert.equal(a.rate, 0.05);
  assert.ok(a.low <= a.rate && a.rate <= a.high);
  assert.ok(b.high - b.low < a.high - a.low);
  assert.throws(() => wilson(0, 0), /positive/);
});

test("missing metrics are reported, never estimated", () => {
  const r = compareRates([{ variant: "A", label: "a", successes: 12, n: 600 }, { variant: "B", label: "b", successes: null, n: null }]);
  assert.equal(r[1].status, "no data");
  assert.match(verdict(r), /fewer than two/);
});

test("small differences do not produce a winner", () => {
  const r = compareRates([{ variant: "A", label: "a", successes: 12, n: 600 }, { variant: "B", label: "b", successes: 15, n: 580 }]);
  assert.match(verdict(r), /not distinguishable/);
});

test("a clear difference is reported", () => {
  const r = compareRates([{ variant: "A", label: "a", successes: 10, n: 5000 }, { variant: "B", label: "b", successes: 200, n: 5000 }]);
  assert.match(verdict(r), /variant B is ahead/);
});
