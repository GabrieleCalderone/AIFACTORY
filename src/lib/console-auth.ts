/**
 * How the launcher and the always-on console recognise each other (pure, no I/O). The token
 * never travels: each side proves it knows it by signing a fresh random value, and the
 * browser is opened with a ticket that works once and for a few seconds only.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Purpose = "server" | "ticket";
const NONCE = /^[a-f0-9]{32,64}$/;
export const isNonce = (n: unknown): n is string => typeof n === "string" && NONCE.test(n);

/** A proof is good for this long around the moment it was made; used nonces are remembered for longer than that. */
export const PROOF_WINDOW_MS = 60_000;

/**
 * HMAC of a nonce and the moment it was made, under the token. The purpose keeps a proof made
 * for one use from serving another; the moment makes an old proof worthless even after its
 * nonce has been forgotten.
 */
export const proofOf = (token: string, purpose: Purpose, nonce: string, at: number): string => createHmac("sha256", token).update(`${purpose}:${nonce}:${at}`).digest("hex");

export const proofOk = (token: string, purpose: Purpose, nonce: unknown, at: unknown, proof: unknown, now: number = Date.now()): boolean => {
  if (!isNonce(nonce) || typeof proof !== "string" || typeof at !== "number" || !Number.isSafeInteger(at) || Math.abs(now - at) > PROOF_WINDOW_MS) return false;
  const expected = Buffer.from(proofOf(token, purpose, nonce, at));
  const given = Buffer.from(proof);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

/** One-time tickets: valid for `ttlMs`, spent on first use; a nonce is accepted once. */
export const createTickets = (ttlMs = 30_000, now: () => number = Date.now) => {
  const tickets = new Map<string, number>();
  const seen = new Map<string, number>();
  const sweep = () => {
    for (const [k, t] of tickets) if (t < now()) tickets.delete(k);
    for (const [k, t] of seen) if (t < now()) seen.delete(k);
  };
  return {
    /** Null when the nonce was already used. */
    issue: (nonce: string): string | null => {
      sweep();
      if (seen.has(nonce)) return null;
      // remembered well past the time its proof could still be accepted
      seen.set(nonce, now() + Math.max(10 * ttlMs, 4 * PROOF_WINDOW_MS));
      const ticket = randomBytes(24).toString("hex");
      tickets.set(ticket, now() + ttlMs);
      return ticket;
    },
    redeem: (ticket: unknown): boolean => {
      sweep();
      return typeof ticket === "string" && tickets.delete(ticket);
    },
  };
};
