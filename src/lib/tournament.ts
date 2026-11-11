/**
 * Ranking by comparison (pure). A vision model is reliable at saying which of two pictures
 * is better and unreliable at giving a picture a mark out of 100, and its verdict can flip
 * with the order the two are shown in. So every pair is judged in both orders: agreement
 * counts as a win, disagreement as a draw. Pairings follow the Swiss system (similar
 * ratings meet, nobody meets twice) and ratings are updated Elo-style.
 */
export type Outcome = "a" | "b" | "draw";
export type Ratings = Record<string, number>;
export const START_RATING = 1000;
const K = 32;

/** Verdicts for one pair shown as (a, b) and as (b, a). "first"/"second" refer to the order shown. */
export const settle = (shownAB: "first" | "second" | null, shownBA: "first" | "second" | null): Outcome => {
  if (!shownAB || !shownBA) return "draw";
  const ab = shownAB === "first" ? "a" : "b";
  const ba = shownBA === "first" ? "b" : "a";
  return ab === ba ? ab : "draw";
};

export const update = (ratings: Ratings, a: string, b: string, outcome: Outcome): Ratings => {
  const ra = ratings[a] ?? START_RATING;
  const rb = ratings[b] ?? START_RATING;
  const expectedA = 1 / (1 + 10 ** ((rb - ra) / 400));
  const scoreA = outcome === "a" ? 1 : outcome === "b" ? 0 : 0.5;
  return { ...ratings, [a]: ra + K * (scoreA - expectedA), [b]: rb + K * (expectedA - scoreA) };
};

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Next round of pairs: players sorted by rating (ties broken by name so runs repeat), each
 * paired with the nearest one below it that it has not met. With an odd count the last sits out.
 */
export const swissRound = (players: string[], ratings: Ratings, played: Set<string>): [string, string][] => {
  const order = [...players].sort((x, y) => (ratings[y] ?? START_RATING) - (ratings[x] ?? START_RATING) || x.localeCompare(y));
  const free = new Set(order);
  const pairs: [string, string][] = [];
  for (const p of order) {
    if (!free.has(p)) continue;
    free.delete(p);
    const opponent = order.find((q) => free.has(q) && !played.has(key(p, q)));
    if (!opponent) continue;
    free.delete(opponent);
    pairs.push([p, opponent]);
  }
  return pairs;
};

export const markPlayed = (played: Set<string>, a: string, b: string): void => void played.add(key(a, b));

/** Final order, best first, with the number of comparisons each picture took part in. */
export const standings = (ratings: Ratings, games: Record<string, number>): { file: string; rating: number; games: number; rank: number }[] =>
  Object.keys(ratings)
    .sort((x, y) => ratings[y] - ratings[x] || x.localeCompare(y))
    .map((file, i) => ({ file, rating: Math.round(ratings[file]), games: games[file] ?? 0, rank: i + 1 }));
