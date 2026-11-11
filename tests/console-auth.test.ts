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

test("a ticket works once, expires, and a nonce is not accepted twice while its proof could still be valid", () => {
  let t = 0;
  const tickets = createTickets(30_000, () => t);
  const ticket = tickets.issue(nonce)!;
  assert.equal(tickets.issue(nonce), null, "replayed nonce");
  assert.equal(tickets.redeem(ticket), true);
  assert.equal(tickets.redeem(ticket), false, "already spent");
  const late = tickets.issue("f".repeat(32))!;
  t = 31_000;
  assert.equal(tickets.redeem(late), false, "expired");
  assert.equal(tickets.redeem(undefined), false);
  t = PROOF_WINDOW_MS + 1000;
  assert.equal(tickets.issue(nonce), null, "still remembered after its proof has expired");
});
