import { test } from "node:test";
import assert from "node:assert/strict";
import { markPlayed, settle, standings, START_RATING, swissRound, update, type Ratings } from "../src/lib/tournament.ts";

test("a pair is decided only when both showing orders agree", () => {
  assert.equal(settle("first", "second"), "a", "a preferred both times");
  assert.equal(settle("second", "first"), "b");
  assert.equal(settle("first", "first"), "draw", "the judge just picked whatever came first");
  assert.equal(settle("second", "second"), "draw");
  assert.equal(settle("first", null), "draw", "no verdict in one order");
});

test("ratings move toward the winner, a draw between equals changes nothing, the total is conserved", () => {
  const start: Ratings = { a: START_RATING, b: START_RATING };
  const won = update(start, "a", "b", "a");
  assert.ok(won.a > START_RATING && won.b < START_RATING);
  assert.equal(Math.round(won.a + won.b), 2 * START_RATING);
  assert.deepEqual(update(start, "a", "b", "draw"), start);
  const upset = update({ a: 1200, b: 1000 }, "a", "b", "b");
  assert.ok(1200 - upset.a > won.a - START_RATING, "losing to a lower-rated picture costs more");
});

test("swiss rounds pair neighbours in rating, never repeat a pairing, and leave the odd one out", () => {
  const players = ["a", "b", "c", "d", "e"];
  const ratings: Ratings = { a: 1100, b: 1090, c: 1000, d: 990, e: 900 };
  const played = new Set<string>();
  const first = swissRound(players, ratings, played);
  assert.deepEqual(first, [["a", "b"], ["c", "d"]]);
  first.forEach(([x, y]) => markPlayed(played, x, y));
  const second = swissRound(players, ratings, played);
  assert.deepEqual(second, [["a", "c"], ["b", "d"]]);
  second.forEach(([x, y]) => markPlayed(played, x, y));
  for (const [x, y] of swissRound(players, ratings, played)) assert.ok(!played.has(x < y ? `${x}|${y}` : `${y}|${x}`));
});

test("standings list the best first with the games played", () => {
  assert.deepEqual(standings({ a: 990.4, b: 1010.6 }, { a: 2 }), [{ file: "b", rating: 1011, games: 0, rank: 1 }, { file: "a", rating: 990, games: 2, rank: 2 }]);
});
