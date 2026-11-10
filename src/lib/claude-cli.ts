/**
 * Headless `claude` CLI calls with a hard timeout, a readable failure reason and one
 * bounded retry. The CLI reports most failures (auth, usage limit, overload) in the JSON
 * envelope on stdout with an empty stderr, so the reason is read from both streams.
 */
import { spawnSync } from "node:child_process";

export type CliResult = { status: number | null; signal?: string | null; stdout?: string | null; stderr?: string | null; error?: (Error & { code?: string }) | null };
export type CliRunner = (args: string[], timeoutMs: number) => CliResult;

/**
 * 45 minutes per call. The run of 2026-11-10 succeeded with two calls in about 50 minutes, so a
 * shorter limit would have failed a run that worked; the hangs of 8 and 9 November lasted 3-4 hours.
 */
export const DEFAULT_TIMEOUT_MS = 45 * 60 * 1000;

/** Timeout from the environment (CLAUDE_CLI_TIMEOUT_MS), falling back to the default on missing or invalid values. */
export const timeoutFromEnv = (env: Record<string, string | undefined> = process.env): number => {
  const n = Number(env.CLAUDE_CLI_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 1000 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
};

/** Removes well-known secret shapes (API keys, bearer tokens, JWTs, key=value credentials) from text bound for logs. */
export const redactSecrets = (text: string): string =>
  text
    .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{12,}/gi, "$1 [redacted]")
    .replace(/\b((?:access|refresh|id)_token|api[_-]?key|secret|password|authorization)(["']?\s*[=:]\s*["']?)[^\s"'&,;]+/gi, "$1$2[redacted]");

const SCAN_CAP = 4000;
/**
 * Caps text before the redaction patterns run. A cut never leaves half a token behind (a split
 * credential could slip past the patterns): the trailing partial token is dropped, and a text
 * with no whitespace at all is replaced by its length.
 */
export const boundForScan = (text: string): string => {
  if (text.length <= SCAN_CAP) return text;
  const head = text.slice(0, SCAN_CAP);
  const cut = head.search(/\s\S*$/);
  return cut > 0 ? head.slice(0, cut) : `output omitted (${text.length} chars, no whitespace)`;
};

/** One-line cause for a failed call; null when the call succeeded. */
export const describeFailure = (res: CliResult, timeoutMs: number): string | null => {
  if (res.error?.code === "ETIMEDOUT") return `claude timed out after ${Math.round(timeoutMs / 1000)}s`;
  if (res.error) return `claude could not run: ${res.error.message}`;
  if (res.status === 0) return null;
  let detail = (res.stderr ?? "").trim();
  if (!detail) {
    const out = (res.stdout ?? "").trim();
    try {
      const envelope = JSON.parse(out) as { result?: unknown; subtype?: unknown };
      detail = [envelope.subtype, envelope.result].filter((v) => typeof v === "string" && v).join(": ");
    } catch {
      detail = out ? `unparseable stdout (${out.length} chars)` : "";
    }
  }
  const exit = res.status === null ? `was killed by ${res.signal ?? "a signal"}` : `exited ${res.status}`;
  return `claude ${exit}: ${redactSecrets(boundForScan(detail)).replace(/\s+/g, " ").slice(0, 400) || "no output on stderr or stdout"}`;
};

const spawnRunner: CliRunner = (args, timeoutMs) =>
  spawnSync("claude", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: timeoutMs, killSignal: "SIGKILL" });

const sleepSync = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/**
 * Runs the CLI and returns the `result` text of its JSON envelope. A failed call is retried
 * (default: one retry) after a pause; the thrown error carries the cause of the last failure.
 */
export const runClaudeCli = (
  args: string[],
  opts: { timeoutMs?: number; attempts?: number; pauseMs?: number; runner?: CliRunner; sleep?: (ms: number) => void; log?: (line: string) => void } = {},
): string => {
  const { timeoutMs = timeoutFromEnv(), attempts = 2, pauseMs = 30_000, runner = spawnRunner, sleep = sleepSync, log = console.log } = opts;
  let failure = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = runner(args, timeoutMs);
    let reason = describeFailure(res, timeoutMs);
    if (!reason) {
      try {
        return (JSON.parse(res.stdout ?? "") as { result?: string }).result ?? "";
      } catch {
        reason = `claude returned unparseable JSON (${(res.stdout ?? "").length} chars)`;
      }
    }
    failure = reason;
    if (attempt < attempts) {
      log(`[claude] ${reason}; retrying (${attempt + 1}/${attempts})`);
      sleep(pauseMs);
    }
  }
  throw new Error(failure);
};
