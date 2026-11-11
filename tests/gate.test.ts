import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaOf, repeatedImages, runGate, scanTexts, weakLeads } from "../src/lib/gate.ts";
import { parsePostSpec } from "../src/schemas/post.ts";
import { demoSpec } from "./fixtures/demo-spec.ts";
import { detailRegion } from "../src/lib/formats.ts";

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

test("published texts may not carry prices, offers or domains other than the brand's", () => {
  const hits = scanTexts({ caption: "Only 49€ today, 20% discount, see other-site.com" }).map((h) => h.split(": ")[1].split(" \"")[0]);
  for (const k of ["price or offer claim", "bare domain"]) assert.ok(hits.includes(k), k);
  assert.deepEqual(scanTexts({ caption: "Prenota su risthome.it (link in bio). Music: Kevin MacLeod (incompetech.com)" }), []);
});

test("offer and domain denylist covers inflections, symbols and any TLD", () => {
  const kinds = (text: string) => scanTexts({ caption: text }).map((h) => h.split(": ")[1].split(" \"")[0]);
  for (const bad of ["Oggi -20%", "Solo -15%", "49 euros a testa", "prezzo scontato", "offerta speciale", "20 per cent off", "visit other-site.xyz", "see sub.example.travel", "Free cancellation", "call 192.168.1.10", "mirror at 1.2.3.4.evil.io"]) {
    assert.ok(kinds(bad).some((k) => k === "price or offer claim" || k === "bare domain"), bad);
  }
  for (const ok of ["Prenota su risthome.it (link in bio)", "Music: Kevin MacLeod (incompetech.com)", "5.0 su Google con 101 recensioni", "Dalla cucina di Giacomo, ep. 12", "www.risthome.it"]) {
    assert.deepEqual(kinds(ok), [], ok);
  }
});

test("a plate is judged against its box, not against the full frame", () => {
  const info = () => ({ width: 1024, height: 768, people: "none" });
  const full = runGate({ ...base, info });
  assert.ok(full.warnings.some((w) => /reel hook.*upscaled 2\.5x to fill/.test(w)));
  const plated = parsePostSpec({ ...demoSpec, reel: { ...demoSpec.reel!, hook: { ...demoSpec.reel!.hook, frame: "plate" }, scenes: demoSpec.reel!.scenes.map((s) => ({ ...s, frame: "plate" })) } });
  assert.equal(runGate({ ...base, spec: plated, info }).warnings.some((w) => /reel (hook|scene)/.test(w)), false);
});

test("photo credits are scanned like every other published text", () => {
  const withCredit = parsePostSpec({ ...demoSpec, credits: ["Mario Rossi, CC BY 4.0, via Wikimedia Commons"] });
  assert.equal(runGate({ ...base, spec: withCredit }).errors.some((e) => /published text/.test(e)), false);
  const withLink = parsePostSpec({ ...demoSpec, credits: ["Mario Rossi, see https://example.org/offer"] });
  assert.ok(runGate({ ...base, spec: withLink }).errors.some((e) => /published text must not contain/.test(e)));
});

test("a detail follows the same photograph shown whole and stays within the enlargement limit", () => {
  const info = () => ({ width: 2160, height: 1328, people: "none" });
  const region = detailRegion(2160, 1328, 0.5, 0.5)!;
  const slides = (second: object) => [demoSpec.carousel!.slides[0], { type: "photo", image: "assets/demo/02.jpg", title: "Busiate" }, second, demoSpec.carousel!.slides[3]];
  const good = parsePostSpec({ ...demoSpec, carousel: { slides: slides({ type: "photo", image: "assets/demo/02.jpg", detail: region }) } });
  assert.equal(runGate({ ...base, spec: good, info }).errors.some((e) => /detail/.test(e)), false);
  const alone = parsePostSpec({ ...demoSpec, carousel: { slides: slides({ type: "photo", image: "assets/demo/03.jpg", detail: region }) } });
  assert.ok(runGate({ ...base, spec: alone, info }).errors.some((e) => /a detail must follow/.test(e)));
  const tooClose = parsePostSpec({ ...demoSpec, carousel: { slides: slides({ type: "photo", image: "assets/demo/02.jpg", detail: { x: 0.4, y: 0.4, w: 0.2, h: 0.2782 } }) } });
  assert.ok(runGate({ ...base, spec: tooClose, info }).errors.some((e) => /enlarged/.test(e)));
});

test("a photograph repeated within the reel or the carousel is found; a detail is not a repeat", () => {
  assert.deepEqual(repeatedImages(spec), []);
  const region = detailRegion(2160, 1328, 0.5, 0.5)!;
  const two = { type: "photo", image: "assets/demo/02.jpg" };
  const withDetail = parsePostSpec({ ...demoSpec, carousel: { slides: [demoSpec.carousel!.slides[0], two, { ...two, detail: region }, demoSpec.carousel!.slides[3]] } });
  assert.deepEqual(repeatedImages(withDetail), []);
  const repeated = parsePostSpec({ ...demoSpec, carousel: { slides: [demoSpec.carousel!.slides[0], two, two, demoSpec.carousel!.slides[3]] } });
  assert.deepEqual(repeatedImages(repeated), ["assets/demo/02.jpg"]);
});

test("a weak photograph of the house never opens or closes a piece", () => {
  const fit: Record<string, number> = { "assets/demo/01.jpg": 42, "assets/demo/02.jpg": 80 };
  const fitOf = (image: string) => fit[image];
  const weakCover = weakLeads(spec, fitOf);
  assert.ok(weakCover.some((i) => /carousel cover: assets\/demo\/01\.jpg is too weak/.test(i)));
  assert.deepEqual(weakLeads(spec, (image) => ({ ...fit, "assets/demo/01.jpg": 70 })[image]).filter((i) => /carousel/.test(i)), []);
  const weakEnd = parsePostSpec({ ...demoSpec, reel: undefined, carousel: { slides: [{ type: "cover", image: "assets/demo/02.jpg", title: "Sicily" }, { type: "photo", image: "assets/demo/01.jpg" }, { type: "cta", title: "Request availability" }] } });
  assert.ok(weakLeads(weakEnd, fitOf).some((i) => /closing photograph/.test(i)));
  assert.deepEqual(weakLeads(weakEnd, () => undefined), [], "a photograph the catalogue does not know is not refused on that ground");
});
