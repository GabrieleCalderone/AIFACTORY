/**
 * Pure planning rules for the autopilot (unit-tested; no IO).
 * - posts every `cadenceDays`, alternating language, rotating archetypes;
 * - every post is its own tracked entry. Single-post A/B variants were dropped: with a few
 *   posts a week they cannot separate a real difference from chance, so results are read
 *   per series (archetype) over a month instead.
 */
export type AutopilotState = {
  cadenceDays: number;
  rotation: string[];
  nextIndex: number;
  langs: ("it" | "en")[];
  nextLang: number;
  lastPostAt: string | null;
  postingHourLocal: number;
};

export type ExperimentLite = { experiment_id: string; variant_id: string; archetype: string; status: string };

export const defaultState: AutopilotState = {
  cadenceDays: 1,
  rotation: ["A6-chef-series", "A1-process-reveal", "A4-private-table", "A2-chef-at-work", "A4-private-table", "A6-chef-series", "A5-proof-and-offer"],
  nextIndex: 0,
  langs: ["en", "it"],
  nextLang: 0,
  lastPostAt: null,
  postingHourLocal: 18,
};

/** Local calendar day as YYYY-MM-DD (the agent runs at 10:30 local time). */
const localDay = (d: Date): number => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

/** Due when at least `cadenceDays` calendar days (local time) have passed since the last post. */
export const isDue = (state: AutopilotState, now: Date): boolean => {
  if (!state.lastPostAt) return true;
  return localDay(now) - localDay(new Date(state.lastPostAt)) >= state.cadenceDays;
};

export type Plan = { archetype: string; lang: "it" | "en"; experimentId: string; variantId: string; reason: string };

export const planNext = (state: AutopilotState, experiments: ExperimentLite[]): Plan => {
  const archetype = state.rotation[state.nextIndex % state.rotation.length];
  const lang = state.langs[state.nextLang % state.langs.length];
  const max = experiments.reduce((m, e) => Math.max(m, Number(e.experiment_id.replace("EXP-", "")) || 0), 0);
  return { archetype, lang, experimentId: `EXP-${String(max + 1).padStart(3, "0")}`, variantId: "A", reason: "next post of the series" };
};

export const advance = (state: AutopilotState, now: Date): AutopilotState => ({
  ...state,
  nextIndex: (state.nextIndex + 1) % state.rotation.length,
  nextLang: (state.nextLang + 1) % state.langs.length,
  lastPostAt: now.toISOString(),
});

/** Next posting slot: today at postingHourLocal if at least 2 h away, otherwise tomorrow. Uses the machine's local time. */
export const nextSlot = (state: AutopilotState, now: Date): Date => {
  const slot = new Date(now);
  slot.setHours(state.postingHourLocal, 0, 0, 0);
  if (slot.getTime() - now.getTime() < 2 * 3600 * 1000) slot.setDate(slot.getDate() + 1);
  return slot;
};

export type CalendarStandard = { maxServiceShare: number; maxOfferShare: number; offerArchetypes: string[]; services: string[] };
export type ArchetypeLite = { id: string; service: string; active?: boolean };

/**
 * Editorial calendar rules of the house standard, checked on the rotation: only active
 * archetypes, never the same format twice in a row (the week must not repeat itself),
 * every service of the house present and none dominating, and a selling post only rarely.
 */
export const calendarIssues = (rotation: string[], archetypes: ArchetypeLite[], std: CalendarStandard): string[] => {
  const issues: string[] = [];
  const byId = new Map(archetypes.map((a) => [a.id, a]));
  if (!rotation.length) return ["the rotation is empty"];
  rotation.forEach((id, i) => {
    const a = byId.get(id);
    if (!a) issues.push(`slot ${i + 1}: unknown archetype ${id}`);
    else if (a.active === false) issues.push(`slot ${i + 1}: ${id} is retired`);
    else if (!std.services.includes(a.service)) issues.push(`slot ${i + 1}: ${id} sells "${a.service}", which the house does not offer`);
    if (rotation.length > 1 && id === rotation[(i + 1) % rotation.length]) issues.push(`slot ${i + 1}: ${id} is followed by itself`);
  });
  for (const service of std.services) {
    const share = rotation.filter((id) => byId.get(id)?.service === service).length / rotation.length;
    if (share === 0) issues.push(`no slot for the service "${service}"`);
    if (share > std.maxServiceShare) issues.push(`"${service}" takes ${Math.round(share * 100)}% of the slots, the limit is ${Math.round(std.maxServiceShare * 100)}%`);
  }
  const offers = rotation.filter((id) => std.offerArchetypes.includes(id)).length / rotation.length;
  if (offers > std.maxOfferShare) issues.push(`selling posts take ${Math.round(offers * 100)}% of the slots, the limit is ${Math.round(std.maxOfferShare * 100)}%`);
  return issues;
};
