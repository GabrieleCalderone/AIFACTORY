import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scorecardIssues, scoreVerdict, type Scorecard } from "../src/lib/scorecard.ts";

const card = (JSON.parse(readFileSync("content/house-standard.json", "utf8")) as { scorecard: Scorecard }).scorecard;
const full = Object.fromEntries(card.criteria.map((c) => [c.id, c.weight]));
const gatesOk = Object.fromEntries(card.hardGates.map((g) => [g.id, true]));

test("the house scorecard adds up to 100 and asks for 85", () => {
  assert.deepEqual(scorecardIssues(card), []);
  assert.equal(card.threshold, 85);
});

test("a broken scorecard is reported", () => {
  const bad: Scorecard = { threshold: 0, criteria: [{ id: "hook", label: "", weight: 60, asks: "" }, { id: "hook", label: "", weight: 30, asks: "" }], hardGates: [] };
  const issues = scorecardIssues(bad);
  assert.ok(issues.some((m) => /add up to 90/.test(m)));
  assert.ok(issues.some((m) => /threshold/.test(m)));
  assert.ok(issues.some((m) => /"hook" is listed twice/.test(m)));
});

test("full marks with every gate passed is approved", () => {
  const v = scoreVerdict(card, full, gatesOk);
  assert.equal(v.total, 100);
  assert.equal(v.passed, true);
  assert.deepEqual(v.weakest, []);
});

test("84 is sent back, 85 passes, and the weakest criterion comes first", () => {
  const first = card.criteria[0]!;
  const at = (lose: number) => scoreVerdict(card, { ...full, [first.id]: first.weight - lose }, gatesOk);
  assert.equal(at(15).passed, true);
  const low = at(16);
  assert.equal(low.passed, false);
  assert.equal(low.weakest[0]?.id, first.id);
  assert.ok(low.problems.some((m) => /84 out of 100/.test(m)));
});

test("a failed or unchecked hard gate refuses a piece whatever it scored", () => {
  const gate = card.hardGates[0]!.id;
  assert.equal(scoreVerdict(card, full, { ...gatesOk, [gate]: false }).passed, false);
  const unchecked = Object.fromEntries(Object.entries(gatesOk).filter(([id]) => id !== gate));
  const v = scoreVerdict(card, full, unchecked);
  assert.equal(v.passed, false);
  assert.ok(v.problems.some((m) => /was not checked/.test(m)));
});

test("missing, out-of-range and unknown scores are problems, not zeros", () => {
  const first = card.criteria[0]!;
  const missing = Object.fromEntries(Object.entries(full).filter(([id]) => id !== first.id));
  assert.ok(scoreVerdict(card, missing, gatesOk).problems.some((m) => m === `no score for ${first.id}`));
  assert.equal(scoreVerdict(card, { ...full, [first.id]: first.weight + 1 }, gatesOk).passed, false);
  assert.ok(scoreVerdict(card, { ...full, charm: 5 }, gatesOk).problems.some((m) => /unknown criterion charm/.test(m)));
});
