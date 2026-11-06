import { test } from "node:test";
import assert from "node:assert/strict";
import { applySet, parseValue } from "../src/lib/variant.ts";

test("parseValue keeps strings, parses numbers and booleans", () => {
  assert.equal(parseValue("3.2"), 3.2);
  assert.equal(parseValue("true"), true);
  assert.equal(parseValue("Make pasta"), "Make pasta");
});

test("applySet follows dotted paths through objects and arrays", () => {
  const obj: Record<string, unknown> = { reel: { hook: { title: "a" }, scenes: [{ text: "x" }, { text: "y" }] } };
  applySet(obj, "reel.hook.title", "b");
  applySet(obj, "reel.scenes.1.text", "z");
  applySet(obj, "reel.scenes.0.durationSec", "3");
  assert.deepEqual(obj, { reel: { hook: { title: "b" }, scenes: [{ text: "x", durationSec: 3 }, { text: "z" }] } });
  assert.throws(() => applySet(obj, "reel.nope.title", "b"), /does not exist/);
});
