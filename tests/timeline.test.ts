import { test } from "node:test";
import assert from "node:assert/strict";
import { secondsToFrames, reelTimeline, buildCaption, reelDurationInFrames } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const FPS = 30;

test("secondsToFrames rounds to the nearest whole frame", () => {
  assert.equal(secondsToFrames(2.8, FPS), 84);
  assert.equal(secondsToFrames(0.4, FPS), 12);
  assert.equal(secondsToFrames(3.25, FPS), 98);
});

test("reel timeline subtracts one transition per cut", () => {
  const spec = parsePostSpec(demoSpec);
  const tl = reelTimeline(spec.reel!, FPS);
  // hook 3.2s=96, scene 2.8s=84, scene 3s=90, cta 3s=90, transition 0.4s=12, three cuts
  assert.deepEqual(tl.sequences.map((s) => s.durationInFrames), [96, 84, 90, 90]);
  assert.equal(tl.transitionInFrames, 12);
  assert.equal(tl.totalInFrames, 96 + 84 + 90 + 90 - 12 * 3);
  assert.equal(reelDurationInFrames(spec.reel!, FPS), tl.totalInFrames);
});

test("reel timeline refuses a scene shorter than two transitions", () => {
  const spec = parsePostSpec(demoSpec);
  const reel = { ...spec.reel!, transitionSec: 1, scenes: [{ ...spec.reel!.scenes[0], durationSec: 1.5 }] };
  assert.throws(() => reelTimeline(reel, FPS), /transition/);
});

test("reel timeline rejects anything above the 90 second Instagram limit", () => {
  const spec = parsePostSpec(demoSpec);
  const tooLong = { ...spec.reel!, scenes: Array.from({ length: 12 }, () => ({ ...spec.reel!.scenes[0], durationSec: 8 })) };
  assert.throws(() => reelTimeline(tooLong, FPS), /90s/);
  const fits = { ...spec.reel!, scenes: Array.from({ length: 12 }, () => ({ ...spec.reel!.scenes[0], durationSec: 6 })) };
  assert.ok(reelTimeline(fits, FPS).totalInFrames <= 90 * FPS);
});

test("buildCaption appends hashtags on their own paragraph", () => {
  const spec = parsePostSpec(demoSpec);
  assert.equal(buildCaption(spec), "Learn to make fresh pasta in Palermo.\n\n#palermo #cookingclass");
  assert.equal(buildCaption({ ...spec, hashtags: [] }), "Learn to make fresh pasta in Palermo.");
});

test("buildCaption adds the music credit when the reel has an attributed track", () => {
  const spec = parsePostSpec({ ...demoSpec, reel: { ...demoSpec.reel!, audio: { src: "audio/fretless.mp3", attribution: '"Fretless" Kevin MacLeod (incompetech.com), CC BY 4.0' } } });
  assert.equal(buildCaption(spec), 'Learn to make fresh pasta in Palermo.\n\nMusic: "Fretless" Kevin MacLeod (incompetech.com), CC BY 4.0\n\n#palermo #cookingclass');
});
