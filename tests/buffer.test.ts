import { test } from "node:test";
import assert from "node:assert/strict";
import { createBufferClient, metricsToColumns } from "../src/adapters/buffer.ts";

const fake = (status: number, body: unknown) => {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const impl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown> });
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
};

test("createPost sends a bearer token, the mutation and the ordered assets", async () => {
  const f = fake(200, { data: { createPost: { __typename: "PostActionSuccess", post: { id: "p1", dueAt: "2026-11-12T17:00:00Z" } } } });
  const c = createBufferClient({ apiKey: "k", fetchImpl: f.impl });
  const post = await c.createPost({ channelId: "ch", text: "hello", assets: [{ video: { url: "https://x/reel.mp4" } }], mode: "customScheduled", dueAt: "2026-11-12T17:00:00Z", metadata: { instagram: { type: "reel" } } });
  assert.equal(post.id, "p1");
  assert.equal(f.calls[0].url, "https://api.buffer.com");
  assert.equal(f.calls[0].headers.Authorization, "Bearer k");
  const vars = f.calls[0].body.variables as { input: Record<string, unknown> };
  assert.equal(vars.input.channelId, "ch");
  assert.equal(vars.input.mode, "customScheduled");
  assert.deepEqual(vars.input.assets, [{ video: { url: "https://x/reel.mp4" } }]);
});

test("GraphQL and HTTP errors are surfaced verbatim", async () => {
  const bad = createBufferClient({ apiKey: "k", fetchImpl: fake(200, { errors: [{ message: "Field 'foo' is not defined" }] }).impl });
  await assert.rejects(() => bad.organizations(), /Field 'foo' is not defined/);
  const http = createBufferClient({ apiKey: "k", fetchImpl: fake(401, {}).impl });
  await assert.rejects(() => http.organizations(), /HTTP 401/);
  const mutationError = createBufferClient({ apiKey: "k", fetchImpl: fake(200, { data: { createPost: { __typename: "MutationError", message: "channel disconnected" } } }).impl });
  await assert.rejects(() => mutationError.createPost({ channelId: "c", text: "t" }), /channel disconnected/);
  assert.throws(() => createBufferClient({ apiKey: "" }), /empty/);
});

test("metrics map onto experiment columns and ignore unknown names", () => {
  const cols = metricsToColumns([
    { type: "reach", name: "reach", value: 1200 },
    { type: "reactions", name: "reactions", value: 80 },
    { type: "saves", name: "saves", value: 31 },
    { type: "weird", name: "weird", value: 5 },
  ]);
  assert.deepEqual(cols, { reach: 1200, likes: 80, saves: 31 });
});

test("429 responses are retried after Retry-After and drafts set saveToDraft", async () => {
  let n = 0;
  const waits: number[] = [];
  const impl = async (_url: string, init: { body: string }) => {
    n++;
    if (n === 1) return { ok: false, status: 429, headers: { get: (h: string) => (h === "retry-after" ? "1" : null) }, json: async () => ({}) };
    const vars = (JSON.parse(init.body) as { variables: { input: Record<string, unknown> } }).variables;
    return { ok: true, status: 200, json: async () => ({ data: { createPost: { __typename: "PostActionSuccess", post: { id: "d1", draft: vars.input.saveToDraft } } } }) };
  };
  const c = createBufferClient({ apiKey: "k", fetchImpl: impl, sleep: async (ms) => { waits.push(ms); } });
  const post = await c.createPost({ channelId: "ch", text: "t", draft: true });
  assert.equal(post.id, "d1");
  assert.deepEqual(waits, [1000]);
  assert.equal(n, 2);
  const auth = await createBufferClient({ apiKey: "k", fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) }).verifyAuth();
  assert.equal(auth.ok, false);
  assert.match(auth.error ?? "", /401/);
});

test("organizations are read from the account, as the live schema requires", async () => {
  let sent = "";
  const fetchImpl = async (_url: string, init: { body: string }) => {
    sent = (JSON.parse(init.body) as { query: string }).query;
    return { ok: true, status: 200, json: async () => ({ data: { account: { organizations: [{ id: "o1", name: "RistHome" }] } } }) };
  };
  const c = createBufferClient({ apiKey: "k", fetchImpl: fetchImpl as never });
  assert.deepEqual(await c.organizations(), [{ id: "o1", name: "RistHome" }]);
  assert.match(sent, /account\s*\{\s*organizations/);
});
