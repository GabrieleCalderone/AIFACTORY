/**
 * Written permission for photographs that show guests (pure rules). A photograph marked
 * "guests-consented" is admitted only with a record of who said yes, when and for what,
 * that nobody has withdrawn. The record lives in data/consents.json, which is not committed
 * (it names people); the proof itself (the message) is kept outside the repository.
 */
export type Consent = {
  /** first name or initials of the person who sent the photograph and said yes */
  from: string;
  /** the day the yes was written, YYYY-MM-DD */
  date: string;
  channel: string;
  /** where the photograph may appear */
  scope: string[];
  credit: "first-name" | "none";
  /** every recognisable person in the photograph agreed (for a minor, the parent) */
  peopleCleared: boolean;
  /** the day the permission was taken back, or null */
  withdrawn: string | null;
};
export type Consents = Record<string, Consent>;

/** Why a guest photograph cannot be used on a channel today, or null when it can. */
export const consentProblem = (entry: Consent | undefined, channel = "instagram", today: Date = new Date()): string | null => {
  if (!entry) return "no written permission on record";
  if (entry.withdrawn) return `permission withdrawn on ${entry.withdrawn}`;
  if (entry.peopleCleared !== true) return "not everyone recognisable in the photograph has agreed";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(entry.date))) return "the permission has no valid date";
  if (Date.parse(entry.date) > today.getTime()) return "the permission is dated in the future";
  if (!entry.from?.trim()) return "the permission does not say who gave it";
  if (!Array.isArray(entry.scope) || !entry.scope.includes(channel)) return `the permission does not cover ${channel}`;
  return null;
};
