/**
 * How the launcher and the always-on console recognise each other (pure, no I/O). The token
 * never travels. The console sends a random challenge; the launcher signs the challenge and a
 * value of its own; only then does the console sign back and hand out a ticket that opens the
 * browser once, for a few seconds. So the console signs nothing for a stranger, and a proof
 * the launcher gives to a stranger cannot be used at the real console.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Purpose = "server" | "ticket";
const NONCE = /^[a-f0-9]{32,64}$/;
export const isNonce = (n: unknown): n is string => typeof n === "string" && NONCE.test(n);

/** A proof is good for this long around the moment it was made; a challenge lives as long. */
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

/**
 * The console's side of the handshake. It first hands out a challenge (a random value, nothing
 * derived from the token); the launcher's proof must sign that challenge, so a proof given to
 * anything else that listens on the port is worthless here. A challenge is spent on first use
 * and expires; so does the ticket it buys. Nothing survives a restart, and nothing needs to.
 */
export const createTickets = (ttlMs = 30_000, now: () => number = Date.now) => {
  const challenges = new Map<string, number>();
  const tickets = new Map<string, number>();
  const sweep = () => {
    for (const [k, t] of challenges) if (t < now()) challenges.delete(k);
    for (const [k, t] of tickets) if (t < now()) tickets.delete(k);
  };
  return {
    challenge: (): string => {
      sweep();
      // bounded: a caller asking for challenges in a loop cannot fill the memory
      if (challenges.size >= 64) challenges.delete(challenges.keys().next().value!);
      const c = randomBytes(16).toString("hex");
      challenges.set(c, now() + PROOF_WINDOW_MS);
      return c;
    },
    /** Spends the challenge whether or not a ticket follows. Null when it was never issued, already used or expired. */
    issue: (challenge: unknown): string | null => {
      sweep();
      if (typeof challenge !== "string" || !challenges.delete(challenge)) return null;
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
