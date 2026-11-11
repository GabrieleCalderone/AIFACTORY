/**
 * Opens the always-on console in the browser: npm run console.
 * The access token never leaves this process. The console sends a challenge, this launcher signs
 * it, the console signs back, and only a ticket that works once and expires in seconds goes into
 * the address the browser opens. A stranger listening on the port gets a proof that is useless
 * anywhere else and cannot produce the answer, so the browser is never opened for it.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { proofOf, proofOk } from "../src/lib/console-auth.ts";

const token = existsSync(".console-token") ? readFileSync(".console-token", "utf8").trim() : "";
if (!/^[a-f0-9]{48}$/.test(token)) {
  console.error("The always-on console is not installed yet: bash scripts/install-console.sh");
  process.exit(1);
}
const port = Number(process.env.DASHBOARD_PORT ?? 4747);
const base = `http://127.0.0.1:${port}`;
const fail = (why: string): never => {
  console.error(`${why} Start the console again with: bash scripts/install-console.sh`);
  process.exit(1);
};
const hello = await fetch(`${base}/api/challenge`, { redirect: "error" }).catch(() => null);
if (!hello) fail(`Nothing answers on port ${port}.`);
const challenge = hello!.ok ? ((await hello!.json()) as { challenge?: unknown }).challenge : null;
if (typeof challenge !== "string" || !/^[a-f0-9]{32}$/.test(challenge)) fail(`What answers on port ${port} is not the RistHome console.`);
const nonce = randomBytes(16).toString("hex");
const signed = `${challenge}${nonce}`;
const at = Date.now();
// This proof signs the challenge of whoever answered: handed to a stranger, it opens nothing at the real console.
const res = await fetch(`${base}/api/ticket`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge, nonce, at, proof: proofOf(token, "ticket", signed, at) }), redirect: "error" }).catch(() => null);
const answer = res?.ok ? ((await res.json()) as { ticket?: unknown; at?: unknown; proof?: unknown }) : null;
// The answer must prove that it comes from the console that holds the same token, or the browser is not opened.
if (!answer || !proofOk(token, "server", signed, answer.at, answer.proof)) fail(`What answers on port ${port} is not the RistHome console.`);
const ticket = answer!.ticket;
if (typeof ticket !== "string" || !/^[a-f0-9]{48}$/.test(ticket)) fail("The console did not hand out an entry ticket.");
spawn("open", [`${base}/?k=${ticket}`], { stdio: "ignore", detached: true }).unref();
console.log("Console opened in the browser.");
