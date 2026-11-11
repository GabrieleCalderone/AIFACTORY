import assert from "node:assert/strict";
import { test } from "node:test";
import { consentProblem, type Consent } from "../src/lib/consent.ts";

const today = new Date("2026-11-20T12:00:00Z");
const yes: Consent = { from: "Anna", date: "2026-11-15", channel: "whatsapp", scope: ["instagram", "website"], credit: "first-name", peopleCleared: true, withdrawn: null };

test("a guest photograph needs a written yes that is dated, complete, for this channel and not withdrawn", () => {
  assert.equal(consentProblem(yes, "instagram", today), null);
  assert.match(consentProblem(undefined, "instagram", today)!, /no written permission/);
  assert.match(consentProblem({ ...yes, withdrawn: "2026-11-18" }, "instagram", today)!, /withdrawn on 2026-11-18/);
  assert.match(consentProblem({ ...yes, peopleCleared: false }, "instagram", today)!, /not everyone/);
  assert.match(consentProblem({ ...yes, scope: ["website"] }, "instagram", today)!, /does not cover instagram/);
  assert.match(consentProblem({ ...yes, date: "soon" }, "instagram", today)!, /no valid date/);
  assert.match(consentProblem({ ...yes, date: "2026-12-01" }, "instagram", today)!, /future/);
  assert.match(consentProblem({ ...yes, from: " " }, "instagram", today)!, /who gave it/);
});
