import assert from "node:assert/strict";
import { test } from "node:test";
import { createTickets, isNonce, PROOF_WINDOW_MS, proofOf, proofOk } from "../src/lib/console-auth.ts";

const token = "a".repeat(48);
const nonce = "0123456789abcdef0123456789abcdef";
const at = 1_800_000_000_000;

test("a proof is bound to the token, the purpose, the nonce and the moment", () => {
  const proof = proofOf(token, "ticket", nonce, at);
  assert.equal(proofOk(token, "ticket", nonce, at, proof, at + 1000), true);
  assert.equal(proofOk(token, "server", nonce, at, proof, at), false, "made for another purpose");
  assert.equal(proofOk("b".repeat(48), "ticket", nonce, at, proof, at), false);
  assert.equal(proofOk(token, "ticket", "f".repeat(32), at, proof, at), false);
  assert.equal(proofOk(token, "ticket", nonce, at + 1, proof, at), false, "another moment was signed");
  assert.equal(proofOk(token, "ticket", nonce, at, "short", at), false);
  assert.equal(proofOk(token, "ticket", "not-a-nonce", at, proof, at), false);
  assert.equal(proofOk(token, "ticket", nonce, String(at), proof, at), false);
  assert.equal(isNonce("abc"), false);
});

test("an old proof is refused, however valid it once was", () => {
  const proof = proofOf(token, "ticket", nonce, at);
  assert.equal(proofOk(token, "ticket", nonce, at, proof, at + PROOF_WINDOW_MS), true);
  assert.equal(proofOk(token, "ticket", nonce, at, proof, at + PROOF_WINDOW_MS + 1), false);
  assert.equal(proofOk(token, "ticket", nonce, at, proof, at - PROOF_WINDOW_MS - 1), false, "from the future");
});

test("a ticket needs a challenge the console issued; challenge and ticket each work once and expire", () => {
  let t = 0;
  const tickets = createTickets(30_000, () => t);
  assert.equal(tickets.issue("f".repeat(32)), null, "never issued");
  const challenge = tickets.challenge();
  const ticket = tickets.issue(challenge)!;
  assert.equal(tickets.issue(challenge), null, "challenge already spent");
  assert.equal(tickets.redeem(ticket), true);
  assert.equal(tickets.redeem(ticket), false, "ticket already spent");
  const late = tickets.issue(tickets.challenge())!;
  t = 31_000;
  assert.equal(tickets.redeem(late), false, "ticket expired");
  const stale = tickets.challenge();
  t += PROOF_WINDOW_MS + 1;
  assert.equal(tickets.issue(stale), null, "challenge expired");
  assert.equal(tickets.redeem(undefined), false);
});
