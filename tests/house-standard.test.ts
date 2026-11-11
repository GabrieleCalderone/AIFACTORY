import { test } from "node:test";
import assert from "node:assert/strict";
import { lintStandard, silence, type HouseStandard } from "../src/lib/house-standard.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";

const std: HouseStandard = {
  version: "test",
  audience: "",
  limits: { hookTitleWords: 8, sceneTextWords: 6, slideTitleWords: 6, slideBodyWords: 18, captionChars: 500, hashtagsMax: 5 },
  banned: { en: ["amazing", "delicious", "best"], it: ["imperdibile"] },
  clinical: ["fried balls", "red topping"],
  voice: [],
  visual: [],
  structure: [],
  principles: [],
};
const base = () => ({
  slug: "t", lang: "en", title: "t",
  brief: { archetype: "A4-private-table", audience: "aud", objective: "obj", hook: "hook", sequence: ["a"], cta: "cta" },
  caption: "A table laid in Palermo.\n\nAsk for a quote on risthome.it (link in bio)",
  hashtags: ["palermo", "risthome"],
  reel: {
    hook: { image: "assets/pool/a.jpg", title: "Dinner at your home" },
    scenes: [{ image: "assets/pool/b.jpg", label: "Antipasto", text: "The table, laid" }],
    cta: { title: "Your table in Palermo" },
  },
});

test("a quiet post passes", () => {
  assert.deepEqual(lintStandard(parsePostSpec(base()), std), []);
});

test("hype words, inventory descriptions, exclamation marks and emoji are violations", () => {
  const raw = base();
  raw.reel.hook.title = "The best dinner!";
  raw.reel.scenes[0].text = "Golden fried balls";
  raw.caption = "Amazing night \u{1F35D}";
  const got = lintStandard(parsePostSpec(raw), std).map((v) => `${v.where}: ${v.message}`);
  assert.equal(got.some((g) => g.startsWith("reel.hook.title: hype word \"best\"")), true);
  assert.equal(got.some((g) => g === "reel.hook.title: exclamation mark"), true);
  assert.equal(got.some((g) => g.startsWith("reel.scenes.0.text: describes food like an inventory")), true);
  assert.equal(got.some((g) => g.startsWith("caption: hype word")), true);
  assert.equal(got.some((g) => g === "caption: emoji"), true);
});

test("banned words match whole words only and follow the post language", () => {
  const raw = base();
  raw.reel.scenes[0].text = "Bestowed, imperdibile";
  assert.deepEqual(lintStandard(parsePostSpec(raw), std), []);
});

test("word, caption and hashtag limits are enforced", () => {
  const raw = base();
  raw.reel.scenes[0].text = "one two three four five six seven";
  raw.caption = "x".repeat(501);
  raw.hashtags = ["a", "b", "c", "d", "e", "f"];
  const got = lintStandard(parsePostSpec(raw), std).map((v) => v.where);
  assert.deepEqual(got.sort(), ["caption", "hashtags", "reel.scenes.0.text"]);
});

test("silence removes only optional texts and leaves required ones for the gate", () => {
  const raw = base();
  raw.reel.hook.title = "The best dinner";
  raw.reel.scenes[0].text = "Golden fried balls";
  const violations = lintStandard(parsePostSpec(raw), std);
  assert.deepEqual(silence(raw, violations), ["reel.scenes.0.text"]);
  assert.equal("text" in raw.reel.scenes[0], false);
  const left = lintStandard(parsePostSpec(raw), std);
  assert.deepEqual(left.map((v) => v.where), ["reel.hook.title"]);
});

test("an English caption names the place and what the house is, and carries the place among its tags", () => {
  const seo = { place: "Palermo", phrases: ["private chef", "cooking class"], rules: [] };
  const post = (caption: string, hashtags: string[]) => parsePostSpec({ ...demoSpec, lang: "en", caption, hashtags });
  const found = (caption: string, hashtags = ["palermo", "risthome"]) => lintStandard(post(caption, hashtags), { ...std, seo }).map((v) => v.message);
  assert.deepEqual(found("A private chef at your table in Palermo."), []);
  assert.ok(found("A chef at your table in Sicily.").some((m) => /does not name Palermo/.test(m)));
  assert.ok(found("A dinner at your table in Palermo.").some((m) => /does not say what the house is/.test(m)));
  assert.ok(found("A cooking class in Palermo.", ["sicily"]).some((m) => /no #palermo/.test(m)));
  assert.equal(lintStandard(parsePostSpec({ ...demoSpec, lang: "it", caption: "Una cena a casa vostra.", hashtags: ["sicilia"] }), { ...std, seo }).some((v) => /Palermo|what the house is/.test(v.message)), false, "Italian posts are not checked for English phrases");
});

test("no sentence twice, no bare course name, a caption in paragraphs with a few symbols at most", () => {
  const rules: HouseStandard = { ...std, limits: { ...std.limits, captionEmojiMax: 2, captionParagraphsMin: 3 }, courseWords: ["primo", "dolce"] };
  const caption = "A private chef in Palermo.\n\n📍 Sicily, in November.\n\nAsk for a quote on risthome.it";
  const post = (slides: object[], cap = caption) => parsePostSpec({ ...demoSpec, lang: "en", reel: undefined, caption: cap, carousel: { slides: [{ type: "cover", image: "assets/demo/01.jpg", title: "Sicily, in November." }, ...slides, { type: "cta", title: "Ask for a quote" }] } });
  const found = (slides: object[], cap?: string) => lintStandard(post(slides, cap), rules).map((v) => v.message);
  assert.deepEqual(found([{ type: "photo", image: "assets/demo/02.jpg", body: "The sea, an hour from the table." }]), []);
  assert.ok(found([{ type: "photo", image: "assets/demo/02.jpg", body: "Sicily, in November" }]).some((m) => /the same words as carousel\.slides\.0\.title/.test(m)));
  assert.ok(found([{ type: "photo", image: "assets/demo/02.jpg", title: "Primo" }]).some((m) => /bare course name/.test(m)));
  assert.ok(found([], "A private chef in Palermo. Ask for a quote.").some((m) => /1 paragraph/.test(m)));
  assert.ok(found([], "A private chef in Palermo 🍋🍋🍋\n\nSicily.\n\nAsk for a quote.").some((m) => /3 symbols, at most 2/.test(m)));
  assert.ok(lintStandard(post([{ type: "photo", image: "assets/demo/02.jpg", body: "Lemons 🍋" }]), rules).some((v) => v.message === "emoji" && v.where.endsWith(".body")), "symbols stay off the slides");
});
