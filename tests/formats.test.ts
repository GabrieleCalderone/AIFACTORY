import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDetails, applyReelFrames, detailProblem, detailRegion, fillFactor, fitFactor, reelFrameFor, REEL_PLATE } from "../src/lib/formats.ts";

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

test("a detail is a mat-shaped box, half the picture across, kept inside the photograph", () => {
  const r = detailRegion(2160, 1328, 0.5, 0.5)!;
  assert.ok(Math.abs((r.w * 2160) / (r.h * 1328) - 912 / 780) < 0.01);
  assert.ok(Math.abs(r.w * 2160 - 776.4) < 2, "half of the widest mat-shaped box (1552 px)");
  assert.equal(detailProblem(2160, 1328, r), null);
  const corner = detailRegion(2160, 1328, 0.98, 0.02)!;
  assert.ok(corner.x + corner.w <= 1.0001 && corner.y === 0);
});

test("a photograph too small for a true detail gives none", () => {
  assert.equal(detailRegion(989, 914, 0.5, 0.5), null, "730 px would be 74% of the picture");
  assert.ok(detailRegion(1200, 1600, 0.5, 0.5));
  assert.equal(detailRegion(2160, 1328, 1.2, 0.5), null);
  assert.equal(detailRegion(2160, 1328, Number.NaN, 0.5), null);
});

test("a stored region is refused when it is enlarged too much, misshapen, outside or the whole picture", () => {
  assert.match(detailProblem(2160, 1328, { x: 0.4, y: 0.4, w: 0.2, h: 0.2782 })!, /enlarged/);
  assert.match(detailProblem(2160, 1328, { x: 0, y: 0, w: 0.5, h: 0.5 })!, /proportions/);
  assert.match(detailProblem(2160, 1328, { x: 0.8, y: 0, w: 0.36, h: 0.5 })!, /outside/);
  assert.match(detailProblem(1100, 940, { x: 0, y: 0, w: 0.9, h: 0.9007 })!, /whole/);
});

test("the author's detail is kept only after its own whole photograph, once, where a point is recorded", () => {
  const size = () => ({ width: 2160, height: 1328 });
  const point = (image: string) => (image === "a.jpg" ? { x: 0.5, y: 0.5 } : null);
  const slides: { type: string; image?: string; detail?: unknown }[] = [
    { type: "cover", image: "a.jpg" },
    { type: "photo", image: "a.jpg", detail: true },
    { type: "photo", image: "b.jpg" },
    { type: "photo", image: "b.jpg", detail: true },
    { type: "photo", image: "a.jpg", detail: true },
    { type: "photo", image: "c.jpg", detail: { x: 0, y: 0, w: 0.1, h: 0.1 } },
  ];
  assert.deepEqual(applyDetails(slides, point, size), [1]);
  assert.equal(typeof (slides[1].detail as { w: number }).w, "number");
  assert.ok(slides.slice(2).every((s) => s.detail === undefined), "no point, not after its whole, or written by the model: removed");
});
