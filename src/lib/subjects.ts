/**
 * Same-subject groups (pure). Two different shots of the same dish look nothing alike to a
 * perceptual hash (measured: 24 bits apart out of 64, like any two unrelated photos), yet in
 * one post, or in two posts a week apart, they read as a repeat. So the descriptions propose
 * pairs, a vision model confirms each pair by looking, and confirmed pairs are merged into
 * groups. The author then offers one photo per group: the best placed one.
 */
const STOP = new Set(["a", "an", "the", "of", "on", "in", "with", "and", "at", "to", "by", "for", "from", "over", "into", "its", "as", "is", "plate", "plated", "white", "dish", "served", "topped", "fine", "dining", "plating", "garnish", "garnished"]);
// The describer names the same thing in different words from one photo to the next.
const SAME: Record<string, string> = { stuffed: "filled", eggplant: "aubergine", prawn: "shrimp", prawns: "shrimp", shrimps: "shrimp", courgette: "zucchini", crispy: "crisp" };

export type SubjectRow = { file: string; subject?: string; tags?: string[] };

export const subjectTokens = (row: SubjectRow): Set<string> => {
  const words = `${row.subject ?? ""} ${(row.tags ?? []).join(" ")}`.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(words.map((w) => SAME[w] ?? w).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)));
};

/** Shared words over all words (Jaccard), 0 to 1. */
export const similarity = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
};

export const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Pairs whose descriptions overlap enough to be worth a look, most alike first. */
export const candidatePairs = (rows: SubjectRow[], threshold = 0.4, max = 120): [string, string][] => {
  const tokens = rows.map((r) => subjectTokens(r));
  const scored: { a: string; b: string; s: number }[] = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const s = similarity(tokens[i], tokens[j]);
      if (s >= threshold) scored.push({ a: rows[i].file, b: rows[j].file, s });
    }
  return scored.sort((x, y) => y.s - x.s || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b))).slice(0, max).map((p) => [p.a, p.b]);
};

/** Confirmed pairs merged into groups; a file that matched nothing is in no group. The group name is its first file by name. */
export const groupsFrom = (confirmed: [string, string][]): Record<string, string> => {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  for (const [a, b] of confirmed) {
    const [ra, rb] = [find(a), find(b)];
    parent.set(a, ra);
    parent.set(b, rb);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
  return Object.fromEntries([...parent.keys()].sort().map((f) => [f, find(f)]));
};

/** Keeps the first item of every group, in the order given (give them best first). */
export const onePerSubject = <T extends { file: string }>(items: T[], groupOf: Record<string, string>): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const g = groupOf[item.file];
    if (!g) return true;
    if (seen.has(g)) return false;
    seen.add(g);
    return true;
  });
};
