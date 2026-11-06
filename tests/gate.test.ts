import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaOf, runGate } from "../src/lib/gate.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const spec = parsePostSpec(demoSpec);
const okInfo = () => ({ width: 1600, height: 2400, people: "none" });
const base = { spec, exists: () => true, info: okInfo, archetypeIds: ["A1-process-reveal"], experimentRows: [{ experiment_id: "EXP-001", variant_id: "A" }] };

test("a finished spec with real assets passes with no errors or warnings", () => {
  assert.deepEqual(runGate(base), { errors: [], warnings: [] });
});

test("TODO texts, missing files and unknown archetypes are errors", () => {
  const todo = parsePostSpec({ ...demoSpec, caption: "TODO: write me" });
  assert.match(runGate({ ...base, spec: todo }).errors[0], /TODO.*caption/);
  assert.match(runGate({ ...base, exists: (p) => p !== "assets/demo/02.jpg" }).errors[0], /missing media.*02\.jpg/);
  assert.match(runGate({ ...base, archetypeIds: [] }).errors[0], /unknown archetype/);
});

test("upscaling, unknown consent and missing experiment rows are warnings; unconsented guests are errors", () => {
  const small = runGate({ ...base, info: () => ({ width: 500, height: 500, people: "none" }) });
  assert.ok(small.warnings.some((w) => /upscaled/.test(w)));
  const unknown = runGate({ ...base, info: () => ({ width: 1600, height: 2400 }) });
  assert.ok(unknown.warnings.some((w) => /consent not recorded/.test(w)));
  const guests = runGate({ ...base, info: () => ({ width: 1600, height: 2400, people: "guests" }) });
  assert.ok(guests.errors.some((e) => /without recorded consent/.test(e)));
  const noRow = runGate({ ...base, experimentRows: [] });
  assert.ok(noRow.warnings.some((w) => /no row in data\/experiments\.csv/.test(w)));
});

test("mediaOf lists images and videos once", () => {
  const withVideo = parsePostSpec({ ...demoSpec, reel: { ...demoSpec.reel!, scenes: [{ video: "assets/demo/clip.mp4" }, { image: "assets/demo/02.jpg" }] } });
  assert.deepEqual(mediaOf(withVideo), { images: ["assets/demo/01.jpg", "assets/demo/02.jpg"], videos: ["assets/demo/clip.mp4"] });
});
