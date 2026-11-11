import assert from "node:assert/strict";
import { test } from "node:test";
import { createTickets, isNonce, proofOf, proofOk } from "../src/lib/console-auth.ts";

const token = "a".repeat(48);
const nonce = "0123456789abcdef0123456789abcdef";

test("a proof is bound to the token, the purpose and the nonce", () => {
  const proof = proofOf(token, "ticket", nonce);
  assert.equal(proofOk(token, "ticket", nonce, proof), true);
  assert.equal(proofOk(token, "server", nonce, proof), false, "made for another purpose");
  assert.equal(proofOk("b".repeat(48), "ticket", nonce, proof), false);
  assert.equal(proofOk(token, "ticket", "f".repeat(32), proof), false);
  assert.equal(proofOk(token, "ticket", nonce, "short"), false);
  assert.equal(proofOk(token, "ticket", "not-a-nonce", proof), false);
  assert.equal(isNonce("abc"), false);
});

test("a ticket works once, expires, and a nonce is not accepted twice", () => {
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
});
