import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TIMEOUT_MS, describeFailure, redactSecrets, runClaudeCli, timeoutFromEnv, type CliResult } from "../src/lib/claude-cli.ts";

const ok = (result: string): CliResult => ({ status: 0, stdout: JSON.stringify({ result }), stderr: "" });
const quiet = { sleep: () => {}, log: () => {}, pauseMs: 0 };

test("the failure reason comes from stderr, else from the JSON envelope on stdout, else says so", () => {
  assert.equal(describeFailure(ok("x"), 1000), null);
  assert.equal(describeFailure({ status: 1, stderr: "bad flag\n", stdout: "" }, 1000), "claude exited 1: bad flag");
  const envelope = JSON.stringify({ is_error: true, subtype: "error_during_execution", result: "Usage limit reached" });
  assert.equal(describeFailure({ status: 1, stderr: "", stdout: envelope }, 1000), "claude exited 1: error_during_execution: Usage limit reached");
  assert.equal(describeFailure({ status: 1, stderr: "", stdout: "" }, 1000), "claude exited 1: no output on stderr or stdout");
  assert.equal(describeFailure({ status: null, signal: "SIGTERM", stderr: "", stdout: "" }, 1000), "claude was killed by SIGTERM: no output on stderr or stdout");
});

test("a timeout and a missing binary are named as such", () => {
  const timedOut = Object.assign(new Error("spawnSync claude ETIMEDOUT"), { code: "ETIMEDOUT" });
  assert.equal(describeFailure({ status: null, signal: "SIGKILL", error: timedOut }, 900_000), "claude timed out after 900s");
  const missing = Object.assign(new Error("spawnSync claude ENOENT"), { code: "ENOENT" });
  assert.match(describeFailure({ status: null, error: missing }, 1000) ?? "", /could not run: spawnSync claude ENOENT/);
});

test("one failed call is retried and the second answer is returned", () => {
  const calls: number[] = [];
  const results = [{ status: 1, stderr: "", stdout: "" }, ok("hello")];
  const text = runClaudeCli(["-p", "x"], { ...quiet, timeoutMs: 5000, runner: (_a, t) => (calls.push(t), results[calls.length - 1]) });
  assert.equal(text, "hello");
  assert.deepEqual(calls, [5000, 5000]);
});

test("after the last attempt the error carries the real cause, and attempts are bounded", () => {
  let n = 0;
  const runner = () => (n++, { status: 1, stderr: "", stdout: JSON.stringify({ result: "Invalid API key" }) });
  assert.throws(() => runClaudeCli([], { ...quiet, runner }), /claude exited 1: Invalid API key/);
  assert.equal(n, 2);
});

test("the timeout is read from the environment and falls back on invalid values", () => {
  assert.equal(timeoutFromEnv({}), DEFAULT_TIMEOUT_MS);
  assert.equal(timeoutFromEnv({ CLAUDE_CLI_TIMEOUT_MS: "120000" }), 120000);
  assert.equal(timeoutFromEnv({ CLAUDE_CLI_TIMEOUT_MS: "abc" }), DEFAULT_TIMEOUT_MS);
  assert.equal(timeoutFromEnv({ CLAUDE_CLI_TIMEOUT_MS: "5" }), DEFAULT_TIMEOUT_MS);
});

test("secrets never reach the failure reason, and raw non-JSON stdout is not echoed", () => {
  const key = "sk-ant-" + "a".repeat(30);
  const envelope = JSON.stringify({ result: `Invalid key ${key} with access_token=abcdef123456 and Bearer abcdefghijklmnop` });
  const reason = describeFailure({ status: 1, stderr: "", stdout: envelope }, 1000) ?? "";
  assert.ok(!reason.includes(key) && !reason.includes("abcdef123456") && !reason.includes("abcdefghijklmnop"), reason);
  assert.match(reason, /Invalid key \[redacted\]/);
  assert.equal(describeFailure({ status: 1, stderr: "", stdout: "raw text sk-secret" }, 1000), "claude exited 1: unparseable stdout (18 chars)");
  assert.equal(redactSecrets("Usage limit reached"), "Usage limit reached");
});

test("a zero exit with unparseable stdout is retried and reported without the raw output", () => {
  let n = 0;
  const runner = () => (n++, { status: 0, stdout: "not json sk-" + "b".repeat(20), stderr: "" });
  assert.throws(() => runClaudeCli([], { ...quiet, runner }), (e: Error) => e.message === "claude returned unparseable JSON (32 chars)");
  assert.equal(n, 2);
});

test("a very large failure output is cut before it is scanned, and stays fast", () => {
  const started = Date.now();
  const reason = describeFailure({ status: 1, stderr: "eyJ" + "a".repeat(5_000_000), stdout: "" }, 1000) ?? "";
  assert.ok(reason.length < 450 && Date.now() - started < 1000, `${reason.length} chars in ${Date.now() - started} ms`);
});
