/**
 * Editorial scorecard of the house: a judgement out of 100 on a finished piece, made by a
 * person or a reviewing model, never a prediction of reach. The weights and the threshold
 * live in content/house-standard.json ("scorecard"); this file only does the arithmetic,
 * so it can be tested. Hard gates stand apart from the score: a piece that fails one is
 * refused whatever it scored.
 */
export type ScoreCriterion = { id: string; label: string; weight: number; asks: string };
export type Scorecard = { threshold: number; criteria: ScoreCriterion[]; hardGates: { id: string; asks: string }[] };

export type ScoreVerdict = {
  total: number;
  passed: boolean;
  /** criteria ordered by the share of their weight they lost, worst first: where to revise */
  weakest: { id: string; score: number; weight: number }[];
  problems: string[];
};

/** Problems in the scorecard itself: it must add up to 100 and name each thing once. */
export const scorecardIssues = (card: Scorecard): string[] => {
  const out: string[] = [];
  const sum = card.criteria.reduce((n, c) => n + c.weight, 0);
  if (sum !== 100) out.push(`the weights add up to ${sum}, not 100`);
  if (card.criteria.some((c) => !Number.isFinite(c.weight) || c.weight <= 0)) out.push("every weight is a positive number");
  if (!(card.threshold > 0 && card.threshold <= 100)) out.push(`the threshold ${card.threshold} is not between 1 and 100`);
  const ids = [...card.criteria.map((c) => c.id), ...card.hardGates.map((g) => g.id)];
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) out.push(`"${id}" is listed twice`);
  return out;
};

/**
 * `scores` holds the points given per criterion (0 to its weight); `gates` holds true for
 * each hard gate that was checked and passed. Anything missing or out of range is a
 * problem, and a piece with problems does not pass: silence is never read as approval.
 */
export const scoreVerdict = (card: Scorecard, scores: Record<string, number>, gates: Record<string, boolean>): ScoreVerdict => {
  const problems: string[] = [];
  let total = 0;
  const lost: { id: string; score: number; weight: number }[] = [];
  for (const c of card.criteria) {
    const s = scores[c.id];
    if (typeof s !== "number" || !Number.isFinite(s)) {
      problems.push(`no score for ${c.id}`);
      continue;
    }
    if (s < 0 || s > c.weight) {
      problems.push(`${c.id}: ${s} is outside 0-${c.weight}`);
      continue;
    }
    total += s;
    lost.push({ id: c.id, score: s, weight: c.weight });
  }
  for (const id of Object.keys(scores)) if (!card.criteria.some((c) => c.id === id)) problems.push(`unknown criterion ${id}`);
  for (const g of card.hardGates) {
    if (gates[g.id] === undefined) problems.push(`hard gate ${g.id} was not checked`);
    else if (!gates[g.id]) problems.push(`hard gate ${g.id} failed`);
  }
  if (!problems.length && total < card.threshold) problems.push(`${total} out of 100, the house asks for ${card.threshold}`);
  const weakest = lost.filter((l) => l.score < l.weight).sort((a, b) => a.score / a.weight - b.score / b.weight);
  return { total, passed: problems.length === 0, weakest, problems };
};
