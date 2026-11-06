import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetPolicy, createHiggsfieldAdapter, estimateUrl } from "../src/adapters/genai.ts";

const fakeFetch = (status: number, body: unknown) => {
  const calls: { url: string; auth: string; body: string }[] = [];
  const impl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, auth: init.headers.Authorization, body: init.body });
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
};

test("estimate posts to /estimate/<model> with key auth and returns USD", async () => {
  const f = fakeFetch(200, { usd: "0.094" });
  const a = createHiggsfieldAdapter({ keyId: "id", keySecret: "secret", fetchImpl: f.impl });
  const usd = await a.estimateUsd({ model: "higgsfield-ai/soul/v2/standard", input: { prompt: "x" } });
  assert.equal(usd, 0.094);
  assert.equal(f.calls[0].url, "https://api.higgsfield.ai/estimate/higgsfield-ai/soul/v2/standard");
  assert.equal(f.calls[0].auth, "Key id:secret");
  assert.equal(f.calls[0].body, '{"prompt":"x"}');
});

test("estimate errors are surfaced, never swallowed", async () => {
  const a = createHiggsfieldAdapter({ keyId: "id", keySecret: "s", fetchImpl: fakeFetch(401, {}).impl });
  await assert.rejects(() => a.estimateUsd({ model: "a/b", input: {} }), /HTTP 401/);
  const b = createHiggsfieldAdapter({ keyId: "id", keySecret: "s", fetchImpl: fakeFetch(200, { nope: 1 }).impl });
  await assert.rejects(() => b.estimateUsd({ model: "a/b", input: {} }), /usd/);
});

test("budget policy defaults to zero and refuses more than EUR 20", () => {
  assert.deepEqual(budgetPolicy({}), { approvedEur: 0, ceilingEur: 20, spendAllowed: false });
  assert.equal(budgetPolicy({ GENAI_MONTHLY_CAP_EUR: "15" }).spendAllowed, true);
  assert.throws(() => budgetPolicy({ GENAI_MONTHLY_CAP_EUR: "25" }), /ceiling/);
});

test("model ids cannot steer the request away from the estimate endpoint", () => {
  assert.equal(estimateUrl("https://api.higgsfield.ai", "higgsfield-ai/soul/v2/standard"), "https://api.higgsfield.ai/estimate/higgsfield-ai/soul/v2/standard");
  for (const bad of ["../requests", "a/../../requests", "a//b", "a/./b", "a/b?x=1", "a/b#c", "/a/b", "a/b/", "%2e%2e/a", "single"]) {
    assert.throws(() => estimateUrl("https://api.higgsfield.ai", bad), new RegExp("model id looks wrong|only the estimate endpoint"), bad);
  }
});
