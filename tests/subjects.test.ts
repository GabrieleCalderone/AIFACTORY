import assert from "node:assert/strict";
import { test } from "node:test";
import { candidatePairs, groupsFrom, onePerSubject, similarity, subjectTokens } from "../src/lib/subjects.ts";

const a = { file: "121.jpg", subject: "Filled pasta in tomato sauce with burrata cream and crisp aubergine garnish on white plate", tags: ["pasta", "plating", "aubergine", "tomato"] };
const b = { file: "162.jpg", subject: "Stuffed pasta in tomato sauce topped with white cream and a crisp dark garnish on a white plate", tags: ["pasta", "plating", "tomato", "fine dining"] };
const c = { file: "49.jpg", subject: "Fried aubergine tower with tomato and basil, crisp wrap and red sauce swirl on white plate", tags: ["plating", "aubergine", "fine-dining", "vegetarian"] };
const d = { file: "70.jpg", subject: "Cannoli with ricotta and pistachio on a slate board", tags: ["dessert", "cannoli"] };

test("two shots of the same dish, described in different words, are proposed as a pair", () => {
  assert.ok(similarity(subjectTokens(a), subjectTokens(b)) >= 0.4);
  assert.deepEqual(candidatePairs([a, b, d]), [["121.jpg", "162.jpg"]]);
});

test("unrelated dishes are not proposed; a row without words never matches", () => {
  assert.equal(similarity(subjectTokens(a), subjectTokens(d)), 0);
  assert.equal(similarity(subjectTokens({ file: "x.jpg" }), subjectTokens(a)), 0);
  assert.deepEqual(candidatePairs([c, d]), []);
});

test("the most alike pairs come first and the list is capped", () => {
  const pairs = candidatePairs([a, b, c], 0.1, 1);
  assert.deepEqual(pairs, [["121.jpg", "162.jpg"]]);
});

test("confirmed pairs chain into one group named after its first file", () => {
  const g = groupsFrom([["b.jpg", "c.jpg"], ["a.jpg", "b.jpg"], ["x.jpg", "y.jpg"]]);
  assert.deepEqual(g, { "a.jpg": "a.jpg", "b.jpg": "a.jpg", "c.jpg": "a.jpg", "x.jpg": "x.jpg", "y.jpg": "x.jpg" });
});

test("one photo per group, the best placed; photos in no group all stay", () => {
  const g = groupsFrom([["121.jpg", "162.jpg"]]);
  const kept = onePerSubject([{ file: "49.jpg" }, { file: "162.jpg" }, { file: "121.jpg" }, { file: "70.jpg" }], g);
  assert.deepEqual(kept.map((k) => k.file), ["49.jpg", "162.jpg", "70.jpg"]);
});
