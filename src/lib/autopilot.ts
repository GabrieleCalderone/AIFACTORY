/**
 * Pure planning rules for the autopilot (unit-tested; no IO).
 * - posts every `cadenceDays`, alternating language, rotating archetypes;
 * - the second post of an archetype becomes variant B of its first experiment when
 *   variant A has been measured, otherwise a new experiment starts.
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
  cadenceDays: 3,
  rotation: ["A1-process-reveal", "A3-menu-list", "A4-private-table", "A2-chef-at-work", "A5-proof-and-offer"],
  nextIndex: 0,
  langs: ["en", "it"],
  nextLang: 0,
  lastPostAt: null,
  postingHourLocal: 18,
};

export const isDue = (state: AutopilotState, now: Date): boolean => {
  if (!state.lastPostAt) return true;
  return now.getTime() - new Date(state.lastPostAt).getTime() >= state.cadenceDays * 24 * 3600 * 1000;
};

export type Plan = { archetype: string; lang: "it" | "en"; experimentId: string; variantId: string; reason: string };

export const planNext = (state: AutopilotState, experiments: ExperimentLite[]): Plan => {
  const archetype = state.rotation[state.nextIndex % state.rotation.length];
  const lang = state.langs[state.nextLang % state.langs.length];
  const ofArchetype = experiments.filter((e) => e.archetype === archetype);
  const byExp = new Map<string, ExperimentLite[]>();
  for (const e of ofArchetype) byExp.set(e.experiment_id, [...(byExp.get(e.experiment_id) ?? []), e]);
  for (const [id, rows] of byExp) {
    const a = rows.find((r) => r.variant_id === "A");
    const hasB = rows.some((r) => r.variant_id === "B");
    if (a && a.status === "measured" && !hasB) {
      return { archetype, lang, experimentId: id, variantId: "B", reason: `variant A of ${id} is measured; testing a second hook` };
    }
  }
  const max = experiments.reduce((m, e) => Math.max(m, Number(e.experiment_id.replace("EXP-", "")) || 0), 0);
  return { archetype, lang, experimentId: `EXP-${String(max + 1).padStart(3, "0")}`, variantId: "A", reason: "new experiment for this archetype" };
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
