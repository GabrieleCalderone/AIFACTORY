/**
 * How the launcher and the always-on console recognise each other (pure, no I/O). The token
 * never travels: each side proves it knows it by signing a fresh random value, and the
 * browser is opened with a ticket that works once and for a few seconds only.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Purpose = "server" | "ticket";
const NONCE = /^[a-f0-9]{32,64}$/;
export const isNonce = (n: unknown): n is string => typeof n === "string" && NONCE.test(n);

/** HMAC of a nonce under the token; the purpose keeps a proof made for one use from serving another. */
export const proofOf = (token: string, purpose: Purpose, nonce: string): string => createHmac("sha256", token).update(`${purpose}:${nonce}`).digest("hex");

export const proofOk = (token: string, purpose: Purpose, nonce: unknown, proof: unknown): boolean => {
  if (!isNonce(nonce) || typeof proof !== "string") return false;
  const expected = Buffer.from(proofOf(token, purpose, nonce));
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
      seen.set(nonce, now() + 10 * ttlMs);
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
