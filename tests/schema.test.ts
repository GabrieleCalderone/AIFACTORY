import { test } from "node:test";
import assert from "node:assert/strict";
import { PostSpec, parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const without = (obj: Record<string, unknown>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

test("demo spec parses and applies defaults", () => {
  const spec = parsePostSpec(demoSpec);
  assert.equal(spec.slug, "demo-post");
  assert.equal(spec.reel?.scenes[0].durationSec, 2.8);
  assert.equal(spec.reel?.scenes[0].motion, "zoom-in");
  assert.equal(spec.reel?.transitionSec, 0.4);
  assert.deepEqual(spec.hashtags, ["#palermo", "#cookingclass"]);
});

test("slug must be url-safe kebab case", () => {
  const r = PostSpec.safeParse({ ...demoSpec, slug: "Not Valid!" });
  assert.equal(r.success, false);
});

test("a post needs a reel or a carousel", () => {
  const r = PostSpec.safeParse(without(demoSpec, "reel", "carousel"));
  assert.equal(r.success, false);
});

test("hashtags are capped at 30 and normalised", () => {
  const many = Array.from({ length: 31 }, (_, i) => `tag${i}`);
  assert.equal(PostSpec.safeParse({ ...demoSpec, hashtags: many }).success, false);
  const ok = parsePostSpec({ ...demoSpec, hashtags: ["Palermo", "#palermo", "sicily"] });
  assert.deepEqual(ok.hashtags, ["#palermo", "#sicily"]);
});

test("caption respects the 2200 character limit", () => {
  const r = PostSpec.safeParse({ ...demoSpec, caption: "x".repeat(2201) });
  assert.equal(r.success, false);
});

test("scene duration must stay within bounds", () => {
  const bad = structuredClone(demoSpec);
  bad.reel!.scenes[0].durationSec = 0.5;
  assert.equal(PostSpec.safeParse(bad).success, false);
});

test("carousel slides are limited to 20 and need at least 2", () => {
  const bad = structuredClone(demoSpec);
  bad.carousel!.slides = [bad.carousel!.slides[0]];
  assert.equal(PostSpec.safeParse(bad).success, false);
});

test("a brief with audience, objective, hook, sequence and cta is required", () => {
  assert.equal(PostSpec.safeParse(without(demoSpec, "brief")).success, false);
  const bad = structuredClone(demoSpec);
  bad.brief.archetype = "random";
  assert.equal(PostSpec.safeParse(bad).success, false);
});

test("camera moves include the local Higgsfield-style presets", () => {
  for (const motion of ["dolly-in", "crash-zoom-in", "arc-left", "arc-right"] as const) {
    const spec = structuredClone(demoSpec);
    spec.reel!.scenes[0] = { ...spec.reel!.scenes[0], motion };
    assert.equal(PostSpec.safeParse(spec).success, true, motion);
  }
  const bad = structuredClone(demoSpec) as unknown as { reel: { scenes: Record<string, unknown>[] } };
  bad.reel.scenes[0] = { ...bad.reel.scenes[0], motion: "orbit-360" };
  assert.equal(PostSpec.safeParse(bad).success, false);
});

test("a reel scene takes exactly one of image or video", () => {
  const spec = structuredClone(demoSpec);
  spec.reel!.scenes[0] = { video: "assets/demo/clip.mp4", text: "Pasta lifted from the pot", trimSec: 1.5 };
  assert.equal(PostSpec.safeParse(spec).success, true);
  const both = structuredClone(demoSpec);
  both.reel!.scenes[0] = { image: "assets/demo/02.jpg", video: "assets/demo/clip.mp4" };
  assert.equal(PostSpec.safeParse(both).success, false);
  const none = structuredClone(demoSpec);
  none.reel!.scenes[0] = { text: "no media" };
  assert.equal(PostSpec.safeParse(none).success, false);
});
