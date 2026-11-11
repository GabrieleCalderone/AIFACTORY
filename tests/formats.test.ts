import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReelFrames, fillFactor, fitFactor, reelFrameFor, REEL_PLATE } from "../src/lib/formats.ts";

test("a photo that would be enlarged more than 1.5x to fill the reel becomes a plate", () => {
  assert.equal(reelFrameFor(3000, 4000), "full");
  assert.equal(reelFrameFor(1080, 1920), "full");
  assert.equal(reelFrameFor(1024, 768), "plate", "small landscape: 2.5x to fill");
  assert.equal(reelFrameFor(707, 739), "plate");
  assert.equal(reelFrameFor(4000, 3000), "full", "large landscape is cropped, not enlarged much");
});

test("fill covers the area, fit stays inside the box", () => {
  assert.equal(fillFactor(1024, 768, 1080, 1920), 2.5);
  assert.ok(fitFactor(1024, 768, REEL_PLATE.width, REEL_PLATE.height) < 1, "the same photo is shown below its real size as a plate");
});

test("frames are set from real sizes; clips and unknown photos are left alone", () => {
  const reel = { hook: { image: "assets/pool/a.jpg" }, scenes: [{ image: "assets/pool/b.jpg" }, { video: "assets/clips/c.mp4" }, { image: "assets/pool/unknown.jpg" }] } as { hook: { image?: string; frame?: "full" | "plate" }; scenes: { image?: string; video?: string; frame?: "full" | "plate" }[] };
  const sizes: Record<string, { width: number; height: number }> = { "assets/pool/a.jpg": { width: 1024, height: 768 }, "assets/pool/b.jpg": { width: 3024, height: 4032 } };
  assert.deepEqual(applyReelFrames(reel, (image) => sizes[image] ?? null), ["reel.hook", "reel.scenes.0"], "one small photo makes every photo a plate");
  assert.equal(reel.hook.frame, "plate");
  assert.equal(reel.scenes[0].frame, "plate");
  assert.equal(reel.scenes[1].frame, undefined);
  assert.equal(reel.scenes[2].frame, undefined);
  const large = { hook: { image: "assets/pool/b.jpg" }, scenes: [{ image: "assets/pool/b.jpg" }] } as typeof reel;
  assert.deepEqual(applyReelFrames(large, (image) => sizes[image] ?? null), []);
  assert.equal(large.hook.frame, "full");
});

test("a cover fills the slide only when its photo is large enough", async () => {
  const { coverFrameFor } = await import("../src/lib/formats.ts");
  assert.equal(coverFrameFor(3024, 4032), "full");
  assert.equal(coverFrameFor(1080, 1350), "full");
  assert.equal(coverFrameFor(720, 523), "plate");
});
