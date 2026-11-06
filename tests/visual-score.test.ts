import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compositionScore,
  originalityScore,
  rankForService,
  scoreAsset,
  technicalScore,
  type CatalogRow,
  type TechnicalRow,
} from "../src/lib/visual-score.ts";

const tech = (over: Partial<TechnicalRow> = {}): TechnicalRow => ({
  file: "01-a.jpg",
  sha256: "x",
  dhash: "0",
  width: 1536,
  height: 2048,
  portrait: true,
  brightness_mean: 140,
  brightness_p5: 20,
  brightness_p95: 240,
  clipped_dark: 0.01,
  clipped_bright: 0.01,
  contrast: 55,
  sharpness: 400,
  noise: 1.0,
  saturation: 90,
  text_space_bottom: 0.6,
  center_weight: 1.1,
  dup_group: 1,
  dup_count: 1,
  ...over,
});
const cat = (over: Partial<CatalogRow> = {}): CatalogRow => ({
  people: "none",
  subject: "pasta",
  tags: ["pasta"],
  quality: "good",
  text_overlay: false,
  aesthetic: 85,
  premium_fit: 80,
  service_fit: { class: 90, chef: 60, villa: 30, events: 20 },
  format_fit: { reel: 90, carousel: 80 },
  issues: [],
  ...over,
});

test("a sharp, well exposed, high-resolution portrait scores high technically; dark and soft photos lose points with reasons", () => {
  const good = technicalScore(tech(), "reel");
  assert.ok(good.score >= 90, String(good.score));
  const dark = technicalScore(
    tech({ brightness_mean: 50, sharpness: 20 }),
    "reel",
  );
  assert.ok(dark.score < 60, String(dark.score));
  assert.ok(
    dark.reasons.some((r) => /dark/.test(r)) &&
      dark.reasons.some((r) => /soft/.test(r)),
  );
  const small = technicalScore(
    tech({ width: 720, height: 600, portrait: false }),
    "reel",
  );
  assert.ok(small.reasons.some((r) => /upscaled/.test(r)));
});

test("composition rewards text space and portrait orientation for reels", () => {
  const roomy = compositionScore(tech(), cat(), "reel");
  const busy = compositionScore(
    tech({ text_space_bottom: 0.26, portrait: false }),
    cat({ format_fit: { reel: 40, carousel: 80 } }),
    "reel",
  );
  assert.ok(roomy.score > busy.score);
  assert.ok(
    busy.reasons.some((r) => /busy bottom/.test(r)) &&
      busy.reasons.some((r) => /landscape/.test(r)),
  );
});

test("originality drops with prior use and near-duplicate use", () => {
  assert.equal(originalityScore(tech(), 0, 0).score, 100);
  assert.equal(originalityScore(tech(), 1, 0).score, 65);
  assert.equal(originalityScore(tech(), 0, 1).score, 80);
  assert.ok(
    originalityScore(tech({ dup_count: 3 }), 0, 0).reasons[0].includes(
      "near-duplicate",
    ),
  );
});

test("Q follows the weights and the tiers; hard constraints block regardless of Q", () => {
  const v = scoreAsset({
    tech: tech(),
    cat: cat(),
    service: "class",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
  });
  assert.equal(v.tier, "premium", `Q=${v.Q} ${v.reasons.join("; ")}`);
  const manual = Math.round(
    0.3 * v.parts.A +
      0.25 * v.parts.R +
      0.2 * v.parts.T +
      0.15 * v.parts.C +
      0.1 * v.parts.U,
  );
  assert.equal(v.Q, manual);
  const wrongService = scoreAsset({
    tech: tech(),
    cat: cat(),
    service: "events",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
  });
  assert.ok(
    wrongService.Q < v.Q &&
      wrongService.reasons.some((r) => /weak fit for events/.test(r)),
  );
  const guests = scoreAsset({
    tech: tech(),
    cat: cat({ people: "guests" }),
    service: "class",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
  });
  assert.equal(guests.tier, "blocked");
  assert.match(guests.reasons[0], /consent/);
  const logo = scoreAsset({
    tech: tech(),
    cat: cat({ text_overlay: true }),
    service: "class",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
  });
  assert.equal(logo.blocked, true);
  const excludedByHand = scoreAsset({
    tech: tech(),
    cat: cat(),
    service: "class",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
    override: { exclude: true, note: "old menu" },
  });
  assert.equal(excludedByHand.tier, "blocked");
  const includedByHand = scoreAsset({
    tech: tech({ sharpness: 10, brightness_mean: 45 }),
    cat: cat({ aesthetic: 30, premium_fit: 20 }),
    service: "class",
    format: "reel",
    usedTimes: 0,
    groupUsedTimes: 0,
    override: { include: true },
  });
  assert.equal(includedByHand.tier, "usable");
});

test("ranking keeps one photo per near-duplicate group and skips excluded or blocked ones", () => {
  const rows = [
    { t: tech({ file: "a.jpg", dup_group: 1 }), c: cat({ aesthetic: 90 }) },
    { t: tech({ file: "b.jpg", dup_group: 1 }), c: cat({ aesthetic: 80 }) },
    { t: tech({ file: "c.jpg", dup_group: 2 }), c: cat({ aesthetic: 70 }) },
    { t: tech({ file: "d.jpg", dup_group: 3 }), c: cat({ people: "guests" }) },
    {
      t: tech({
        file: "e.jpg",
        dup_group: 4,
        sharpness: 5,
        brightness_mean: 40,
      }),
      c: cat({
        aesthetic: 20,
        premium_fit: 10,
        service_fit: { class: 10, chef: 0, villa: 0, events: 0 },
      }),
    },
  ];
  const verdicts = rows.map((r) =>
    scoreAsset({
      tech: r.t,
      cat: r.c,
      service: "class",
      format: "reel",
      usedTimes: 0,
      groupUsedTimes: 0,
    }),
  );
  const techByFile = Object.fromEntries(rows.map((r) => [r.t.file, r.t]));
  const picked = rankForService(verdicts, techByFile, 10).map((v) => v.file);
  assert.deepEqual(picked, ["a.jpg", "c.jpg"]);
});
