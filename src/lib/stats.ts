/** Small-sample statistics for creative experiments. */

export type Interval = { rate: number; low: number; high: number };

/** Wilson score interval for a binomial proportion (default 95%). */
export const wilson = (successes: number, n: number, z = 1.96): Interval => {
  if (!(n > 0)) throw new Error("n must be positive");
  if (successes < 0 || successes > n) throw new Error("successes must be within [0, n]");
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
};

export type VariantRate = { variant: string; label: string; successes: number | null; n: number | null };
export type VariantResult = VariantRate & ({ status: "no data" } | ({ status: "ok" } & Interval));

export const compareRates = (variants: VariantRate[]): VariantResult[] =>
  variants.map((v) => {
    if (v.successes === null || v.n === null || v.n <= 0) return { ...v, status: "no data" as const };
    return { ...v, status: "ok" as const, ...wilson(v.successes, v.n) };
  });

/** Plain-language verdict that refuses to name a winner when intervals overlap. */
export const verdict = (results: VariantResult[]): string => {
  const measured = results.filter((r): r is Extract<VariantResult, { status: "ok" }> => r.status === "ok");
  if (measured.length < 2) return "nothing to compare yet: fewer than two variants have data";
  const best = measured.reduce((a, b) => (b.rate > a.rate ? b : a));
  const overlap = measured.some((o) => o !== best && best.low <= o.high);
  if (overlap) {
    return `variant ${best.variant} has the highest rate but its interval overlaps the others: not distinguishable with this sample`;
  }
  return `variant ${best.variant} is ahead and its 95% interval does not overlap the others (re-check after the next post)`;
};

export const pct = (x: number, digits = 1): string => `${(x * 100).toFixed(digits)}%`;
