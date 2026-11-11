/**
 * Opens the always-on console in the browser: npm run console.
 * The access token never leaves this process: the console first proves that it knows it (so a
 * stranger listening on the port learns nothing), then hands out a ticket that works once and
 * expires in seconds, and only that ticket goes into the address the browser opens.
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
const challenge = randomBytes(16).toString("hex");
const hello = await fetch(`${base}/api/proof?n=${challenge}`, { redirect: "error" }).catch(() => null);
const answer = hello?.ok ? ((await hello.json()) as { proof?: unknown }) : null;
if (!answer) fail(`Nothing answers on port ${port}.`);
if (!proofOk(token, "server", challenge, answer!.proof)) fail(`What answers on port ${port} is not the RistHome console.`);
const nonce = randomBytes(16).toString("hex");
const res = await fetch(`${base}/api/ticket`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nonce, proof: proofOf(token, "ticket", nonce) }), redirect: "error" }).catch(() => null);
const ticket = res?.ok ? ((await res.json()) as { ticket?: unknown }).ticket : null;
if (typeof ticket !== "string" || !/^[a-f0-9]{48}$/.test(ticket)) fail("The console did not hand out an entry ticket.");
spawn("open", [`${base}/?k=${ticket}`], { stdio: "ignore", detached: true }).unref();
console.log("Console opened in the browser.");
