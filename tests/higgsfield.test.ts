import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSpend,
  createHiggsfieldClient,
  extractOutputs,
  modelUrl,
  monthSpendEur,
} from "../src/adapters/higgsfield.ts";

const fake = (routes: Record<string, { status?: number; body: unknown }>) => {
  const calls: { url: string; method: string; auth: string; body?: string }[] =
    [];
  const impl = async (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      auth: init?.headers?.Authorization ?? "",
      body: init?.body,
    });
    const key = Object.keys(routes).find((k) => url.includes(k));
    const r = key ? routes[key] : { status: 404, body: {} };
    return {
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      json: async () => r.body,
    };
  };
  return { impl, calls };
};

test("model paths are confined to the API origin and never point at /requests or /estimate", () => {
  assert.equal(
    modelUrl("https://api.higgsfield.ai", "higgsfield-ai/soul/v2/standard"),
    "https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard",
  );
  for (const bad of [
    "requests/x",
    "estimate/a/b",
    "../a",
    "a//b",
    "a/b?x=1",
    "single",
  ])
    assert.throws(() => modelUrl("https://api.higgsfield.ai", bad), bad);
});

test("submit, status and cancel follow the documented lifecycle with Key auth", async () => {
  const f = fake({
    "/higgsfield-ai/soul/v2/standard": {
      body: {
        status: "queued",
        request_id: "r1",
        status_url: "https://api.higgsfield.ai/requests/r1/status",
        cancel_url: "https://api.higgsfield.ai/requests/r1/cancel",
      },
    },
    "/requests/r1/status": {
      body: {
        status: "completed",
        images: [{ url: "https://cdn.example/out.png" }],
        meta: { thumb: "https://cdn.example/t.jpg" },
      },
    },
    "/requests/r1/cancel": { body: {} },
  });
  const c = createHiggsfieldClient({
    keyId: "id",
    keySecret: "sec",
    fetchImpl: f.impl,
  });
  const sub = await c.submit("higgsfield-ai/soul/v2/standard", { prompt: "x" });
  assert.equal(sub.requestId, "r1");
  assert.equal(f.calls[0].auth, "Key id:sec");
  assert.equal(f.calls[0].method, "POST");
  const st = await c.status(sub.statusUrl);
  assert.equal(st.done, true);
  assert.deepEqual(st.outputs, [
    "https://cdn.example/out.png",
    "https://cdn.example/t.jpg",
  ]);
  await c.cancel(sub.cancelUrl);
  assert.equal(f.calls[2].method, "POST");
});

test("status links outside the API origin are refused; waitFor polls until done", async () => {
  const f = fake({
    "/requests/r2/status": { body: { status: "in_progress" } },
  });
  const c = createHiggsfieldClient({
    keyId: "id",
    keySecret: "sec",
    fetchImpl: f.impl,
  });
  await assert.rejects(
    () => c.status("https://evil.example/requests/r2/status"),
    /outside the API/,
  );
  let polls = 0;
  const impl = async () => {
    polls++;
    return {
      ok: true,
      status: 200,
      json: async () =>
        polls < 3
          ? { status: "in_progress" }
          : {
              status: "completed",
              video: { url: "https://cdn.example/v.mp4" },
            },
    };
  };
  const c2 = createHiggsfieldClient({
    keyId: "id",
    keySecret: "sec",
    fetchImpl: impl,
  });
  const done = await c2.waitFor(
    "https://api.higgsfield.ai/requests/r2/status",
    { intervalMs: 1, sleep: async () => undefined },
  );
  assert.equal(polls, 3);
  assert.deepEqual(done.outputs, ["https://media.higgsfield.ai/v.mp4"]);
});

test("extractOutputs only keeps media URLs", () => {
  assert.deepEqual(
    extractOutputs({
      a: "https://x/y.png",
      b: "https://x/page.html",
      c: ["https://x/z.mp4?sig=1", "not a url"],
    }),
    ["https://x/y.png", "https://x/z.mp4?sig=1"],
  );
});

test("the monthly cap blocks spend by default and counts only the current month", () => {
  const ledger = [
    { at: "2026-11-02T10:00:00Z", model: "m", usd: 2 },
    { at: "2026-10-30T10:00:00Z", model: "m", usd: 50 },
  ];
  const now = new Date("2026-11-07T10:00:00Z");
  assert.equal(monthSpendEur(ledger, now).toFixed(2), "1.90");
  assert.equal(canSpend(ledger, 1, 0, now).ok, false);
  assert.equal(canSpend(ledger, 1, 15, now).ok, true);
  assert.match(canSpend(ledger, 20, 15, now).reason, /above the cap/);
});
