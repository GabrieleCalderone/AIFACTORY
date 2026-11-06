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
