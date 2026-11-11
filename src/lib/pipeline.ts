/**
 * Editorial pipeline state machine, persisted in data/pipeline.json (one record per post slug).
 *
 *   DISCOVERED -> QUALITY_CHECKED -> APPROVED -> RENDERED -> READY -> SCHEDULED -> PUBLISHED -> MEASURED
 *   (a preview render before approval is allowed: QUALITY_CHECKED -> RENDERED -> READY -> APPROVED -> SCHEDULED)
 *   side states: REJECTED (quality or human), BLOCKED (missing prerequisite), FAILED (runtime error)
 *
 * Produced is never confused with published: SCHEDULED needs a Buffer post id, PUBLISHED needs
 * the platform's confirmation (status "sent" or an external link), MEASURED needs metrics.
 */
export const STATES = [
  "DISCOVERED",
  "QUALITY_CHECKED",
  "APPROVED",
  "RENDERED",
  "READY",
  "SCHEDULED",
  "PUBLISHED",
  "MEASURED",
  "REJECTED",
  "BLOCKED",
  "FAILED",
] as const;
export type State = (typeof STATES)[number];

const NEXT: Record<State, State[]> = {
  DISCOVERED: ["QUALITY_CHECKED", "REJECTED", "FAILED"],
  QUALITY_CHECKED: ["APPROVED", "RENDERED", "REJECTED", "BLOCKED", "FAILED"],
  APPROVED: ["RENDERED", "READY", "SCHEDULED", "REJECTED", "FAILED"],
  RENDERED: ["READY", "APPROVED", "BLOCKED", "REJECTED", "FAILED"],
  READY: ["APPROVED", "SCHEDULED", "BLOCKED", "REJECTED", "FAILED"],
  SCHEDULED: ["PUBLISHED", "FAILED", "REJECTED"],
  PUBLISHED: ["MEASURED", "FAILED"],
  MEASURED: ["MEASURED"],
  REJECTED: ["DISCOVERED"],
  BLOCKED: ["QUALITY_CHECKED", "APPROVED", "RENDERED", "READY", "REJECTED"],
  FAILED: [
    "DISCOVERED",
    "QUALITY_CHECKED",
    "APPROVED",
    "RENDERED",
    "READY",
    "SCHEDULED",
  ],
};

export type Record_ = {
  slug: string;
  state: State;
  updatedAt: string;
  history: { at: string; from: State | null; to: State; note?: string }[];
  /** approvedSha: SHA-256 of the post file as it was when a person approved it. */
  evidence?: { bufferPostIds?: string[]; postUrl?: string; metricsAt?: string; approvedSha?: string };
};

export type Pipeline = Record<string, Record_>;

export const canTransition = (from: State, to: State): boolean =>
  NEXT[from].includes(to);

export const transition = (
  pipeline: Pipeline,
  slug: string,
  to: State,
  note?: string,
  now = new Date(),
): Record_ => {
  const current = pipeline[slug];
  const at = now.toISOString();
  if (!current) {
    if (to !== "DISCOVERED")
      throw new Error(`${slug}: first state must be DISCOVERED, got ${to}`);
    const rec: Record_ = {
      slug,
      state: to,
      updatedAt: at,
      history: [{ at, from: null, to, note }],
    };
    pipeline[slug] = rec;
    return rec;
  }
  if (current.state === to && to !== "MEASURED") return current;
  if (!canTransition(current.state, to))
    throw new Error(`${slug}: illegal transition ${current.state} -> ${to}`);
  current.history.push({ at, from: current.state, to, note });
  current.state = to;
  current.updatedAt = at;
  return current;
};

/** Evidence rules: a state that claims platform facts must carry them. */
export const assertEvidence = (rec: Record_): void => {
  if (rec.state === "SCHEDULED" && !rec.evidence?.bufferPostIds?.length)
    throw new Error(`${rec.slug}: SCHEDULED without Buffer post ids`);
  if (
    rec.state === "PUBLISHED" &&
    !rec.evidence?.postUrl &&
    !rec.evidence?.bufferPostIds?.length
  )
    throw new Error(`${rec.slug}: PUBLISHED without platform confirmation`);
  if (rec.state === "MEASURED" && !rec.evidence?.metricsAt)
    throw new Error(`${rec.slug}: MEASURED without metrics timestamp`);
};

export const summarize = (pipeline: Pipeline): Record<State, number> => {
  const out = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<
    State,
    number
  >;
  for (const r of Object.values(pipeline)) out[r.state]++;
  return out;
};

/** States in which a post has reached the audience or is on its way to it. */
export const LIVE_STATES: State[] = ["READY", "APPROVED", "SCHEDULED", "PUBLISHED", "MEASURED"];

/**
 * The most recent posts that count for the "do not repeat a photo" rule: published ones and
 * the ones waiting to be, newest first. Rejected, failed and abandoned drafts never showed
 * their photos to anyone, so they do not use them up.
 */
export const recentLiveSlugs = (pipeline: Pipeline, n: number): string[] =>
  Object.values(pipeline)
    .filter((r) => LIVE_STATES.includes(r.state))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.slug.localeCompare(b.slug))
    .slice(0, n)
    .map((r) => r.slug);

/**
 * How many recent posts keep their photos out of the next one. Eight when the archive allows
 * it; fewer when the photos fit for a service are few, so that the calendar does not stop:
 * the archive is fixed, and a small set has to come round again sooner.
 */
export const cooldownPosts = (usablePhotos: number, photosPerPost: number, max = 8): number =>
  Math.max(1, Math.min(max, Math.floor(usablePhotos / Math.max(1, photosPerPost)) - 1));
