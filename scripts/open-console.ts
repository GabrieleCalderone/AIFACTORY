/** Opens the always-on console in the browser: node scripts/open-console.ts (or: npm run console). The link is never printed. */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const token = existsSync(".console-token") ? readFileSync(".console-token", "utf8").trim() : "";
if (!/^[a-f0-9]{48}$/.test(token)) {
  console.error("The always-on console is not installed yet: bash scripts/install-console.sh");
  process.exit(1);
}
const port = Number(process.env.DASHBOARD_PORT ?? 4747);
const res = await fetch(`http://127.0.0.1:${port}/api/status`, { headers: { "x-console-token": token } }).catch(() => null);
if (!res?.ok) {
  console.error(`The console does not answer on port ${port}. Start it again with: bash scripts/install-console.sh`);
  process.exit(1);
}
spawn("open", [`http://127.0.0.1:${port}/?t=${token}`], { stdio: "ignore", detached: true }).unref();
console.log("Console opened in the browser.");
