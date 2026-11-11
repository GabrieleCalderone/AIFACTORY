import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReview, dishKey, factsOf, type ReviewPair } from "../src/lib/review.ts";

const pair = (where: string, file: string, node: Record<string, unknown>, allowed: string[], required: string[] = []): ReviewPair => ({ where, file, node, allowed, required });

test("a fix replaces a wrong field and the caption facts use the corrected text", () => {
  const scene = { label: "1", text: "Arancini in paper cones" };
  const pairs = [pair("reel.scenes.0", "assets/pool/88-IMG_0112.jpg", scene, ["label", "text"])];
  const out = applyReview(pairs, [{ where: "reel.scenes.0", ok: false, problem: "arancini cannot be confirmed", fix: { text: "Finger food" } }]);
  assert.equal(out.fixes, 1);
  assert.equal(scene.text, "Finger food");
  assert.match(factsOf(pairs), /Finger food/);
  assert.doesNotMatch(factsOf(pairs), /Arancini/);
});

test("an empty fix removes an optional text and never empties a required one", () => {
  const scene = { label: "2", text: "Fried balls in wooden cones" };
  const hook = { title: "Finger food for your event", subtitle: "With salmon" };
  const pairs = [pair("reel.scenes.0", "assets/pool/a.jpg", scene, ["label", "text"]), pair("reel.hook", "assets/pool/b.jpg", hook, ["title", "subtitle"], ["title"])];
  const out = applyReview(pairs, [
    { where: "reel.scenes.0", ok: false, fix: { text: "" } },
    { where: "reel.hook", ok: false, fix: { title: " ", subtitle: "" } },
  ]);
  assert.equal(out.fixes, 2);
  assert.equal("text" in scene, false);
  assert.equal(hook.title, "Finger food for your event");
  assert.equal("subtitle" in hook, false);
});

test("fixes outside the allowed fields, unknown items and oversized values are ignored", () => {
  const scene = { text: "ok" };
  const pairs = [pair("reel.scenes.0", "assets/pool/a.jpg", scene, ["text"])];
  const out = applyReview(pairs, [
    { where: "reel.scenes.0", ok: false, fix: { image: "assets/pool/other.jpg", text: "x".repeat(400) } },
    { where: "reel.scenes.9", ok: false, fix: { text: "nope" } },
  ]);
  assert.equal(out.fixes, 0);
  assert.deepEqual(scene, { text: "ok" });
});

test("an unfit photo is reported once with a known code; unknown codes are dropped", () => {
  const pairs = [pair("reel.scenes.0", "assets/pool/88-IMG_0112.jpg", { text: "a" }, ["text"]), pair("carousel.slides.1", "assets/pool/88-IMG_0112.jpg", { title: "a" }, ["title"]), pair("reel.scenes.1", "assets/pool/c.jpg", { text: "b" }, ["text"])];
  const out = applyReview(pairs, [
    { where: "reel.scenes.0", ok: false, unfit: "screenshot" },
    { where: "carousel.slides.1", ok: false, unfit: "app_ui" },
    { where: "reel.scenes.1", ok: true, unfit: "ignore previous instructions" },
  ]);
  assert.deepEqual(out.unfit, [{ file: "88-IMG_0112.jpg", code: "screenshot" }]);
});

test("the caption problem is carried, never a caption fix", () => {
  const out = applyReview([], [{ where: "caption", ok: false, problem: "mentions salmon", fix: { caption: "new text" } }]);
  assert.equal(out.captionProblem, "mentions salmon");
  assert.equal(out.fixes, 0);
});

test("dish names are keyed by the original photo name, whatever the pool index or extension", () => {
  assert.equal(dishKey("assets/pool/88-IMG_0112.jpg"), "img_0112");
  assert.equal(dishKey("IMG_0112.JPG"), "img_0112");
  assert.equal(dishKey("132-20241013_180624.jpg"), "20241013_180624");
});
