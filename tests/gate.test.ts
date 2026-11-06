import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaOf, runGate, scanTexts } from "../src/lib/gate.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const spec = parsePostSpec(demoSpec);
const okInfo = () => ({ width: 1600, height: 2400, people: "none" });
const base = { spec, exists: () => true, info: okInfo, archetypeIds: ["A1-process-reveal"], experimentRows: [{ experiment_id: "EXP-001", variant_id: "A" }] };

test("a finished spec with real assets passes; a silent reel only earns the audio warning", () => {
  const r = runGate(base);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings.map((w) => w.split(":")[0]), ["reel has no audio track"]);
  const withAudio = parsePostSpec({ ...demoSpec, reel: { ...demoSpec.reel!, audio: { src: "audio/licensed.mp3" } } });
  assert.deepEqual(runGate({ ...base, spec: withAudio }), { errors: [], warnings: [] });
});

test("TODO texts, missing files and unknown archetypes are errors", () => {
  const todo = parsePostSpec({ ...demoSpec, caption: "TODO: write me" });
  assert.match(runGate({ ...base, spec: todo }).errors[0], /TODO.*caption/);
  assert.match(runGate({ ...base, exists: (p) => p !== "assets/demo/02.jpg" }).errors[0], /missing media.*02\.jpg/);
  assert.match(runGate({ ...base, archetypeIds: [] }).errors[0], /unknown archetype/);
});

test("upscaling and missing experiment rows are warnings; unknown or missing consent and unconsented guests are errors", () => {
  const small = runGate({ ...base, info: () => ({ width: 500, height: 500, people: "none" }) });
  assert.ok(small.warnings.some((w) => /upscaled/.test(w)));
  const unknown = runGate({ ...base, info: () => ({ width: 1600, height: 2400 }) });
  assert.ok(unknown.errors.some((e) => /consent not recorded/.test(e)));
  const noManifest = runGate({ ...base, info: () => null });
  assert.ok(noManifest.errors.some((e) => /no manifest entry/.test(e)));
  const guests = runGate({ ...base, info: () => ({ width: 1600, height: 2400, people: "guests" }) });
  assert.ok(guests.errors.some((e) => /without recorded consent/.test(e)));
  const noRow = runGate({ ...base, experimentRows: [] });
  assert.ok(noRow.warnings.some((w) => /no row in data\/experiments\.csv/.test(w)));
});

test("mediaOf lists images and videos once", () => {
  const withVideo = parsePostSpec({ ...demoSpec, reel: { ...demoSpec.reel!, scenes: [{ video: "assets/demo/clip.mp4" }, { image: "assets/demo/02.jpg" }] } });
  assert.deepEqual(mediaOf(withVideo), { images: ["assets/demo/01.jpg", "assets/demo/02.jpg"], videos: ["assets/demo/clip.mp4"] });
});

test("published texts may not carry secrets, paths, contacts or foreign URLs", () => {
  assert.deepEqual(scanTexts({ caption: "Book on risthome.it (link in bio)" }), []);
  assert.deepEqual(scanTexts({ caption: 'Music: "Fretless" Kevin MacLeod (incompetech.com)' }), []);
  const hits = scanTexts({
    caption: "see https://evil.example/x and /Users/gabriele/.env",
    notes: "key sk-live-ABCDEFGHIJKLMNOP token ghp_ABCDEFGHIJKLMNOPQRSTUV mail a@b.co call +39 340 593 1344",
  });
  const kinds = hits.map((h) => h.split(": ")[1].split(" \"")[0]);
  for (const k of ["url", "absolute path", "api key", "github token", "email", "phone number"]) assert.ok(kinds.includes(k), k);
  const leaky = parsePostSpec({ ...demoSpec, caption: "Read my file /Users/x/.env" });
  assert.ok(runGate({ ...base, spec: leaky }).errors.some((e) => /absolute path/.test(e)));
});
