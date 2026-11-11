import assert from "node:assert/strict";
import { test } from "node:test";
import { madeWith, workflowSteps, type WorkflowFacts } from "../src/lib/workflow.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const facts: WorkflowFacts = { dishes: { chef: 36, class: 19 }, claudeCli: true, contextApproved: 3, unsplashKey: false, generatedClips: 1, higgsfieldApiKey: true, elevenLabsKey: false, soundBeds: 0, stockTracks: 2, standardVersion: "2026-11-11b", ffmpeg: true, mediaHost: true, bufferKey: true, channels: ["instagram", "tiktok", "facebook"], autopilotInstalled: true, weekdays: [1, 3, 5, 0], langs: ["en"], autopublish: false, measured: 0 };

test("every step names its tools and a missing key is shown as missing, never as connected", () => {
  const steps = workflowSteps(facts);
  assert.deepEqual(steps.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const byName = new Map(steps.flatMap((s) => s.tools).map((t) => [t.name, t]));
  assert.equal(byName.get("Unsplash")!.status, "missing");
  assert.equal(byName.get("ElevenLabs")!.status, "missing");
  assert.equal(byName.get("Buffer")!.status, "ok");
  assert.equal(byName.get("Buffer")!.note, "instagram, tiktok, facebook");
  assert.equal(byName.get("Higgsfield (crediti abbonamento)")!.status, "manual");
  assert.equal(steps[7].count, "lun, mer, ven, dom · EN");
  assert.equal(steps[3].count, "2 brani con credito");
});

test("Buffer with a key but no channel is not connected", () => {
  const buffer = workflowSteps({ ...facts, channels: [] }).flatMap((s) => s.tools).find((t) => t.name === "Buffer")!;
  assert.deepEqual([buffer.status, buffer.note], ["missing", "nessun canale rilevato"]);
});

test("a post says what it was made with", () => {
  assert.deepEqual(madeWith(parsePostSpec(demoSpec)).slice(-2), ["testi: Claude", "montaggio: Remotion"]);
  const spec = parsePostSpec({
    ...demoSpec,
    aiGenerated: true,
    reel: { ...demoSpec.reel!, audio: { src: "audio/beds/sea-terrace.mp3" }, scenes: [{ video: "assets/generated/x.mp4" }, { image: "assets/context/1.jpg" }, ...demoSpec.reel!.scenes.slice(0, 1)] },
  });
  const made = madeWith(spec);
  assert.ok(made.includes("1 foto di contesto con licenza"));
  assert.ok(made.includes("1 clip animato da Higgsfield (dichiarato AI)"));
  assert.ok(made.includes("suono: ElevenLabs"));
});

test("automatic publishing is shown as a warning on the approval step", () => {
  const approval = (autopublish: boolean) => workflowSteps({ ...facts, autopublish })[6].tools[0];
  assert.equal(approval(false).status, "ok");
  assert.equal(approval(true).status, "manual");
  assert.match(approval(true).note, /senza essere guardati/);
});
