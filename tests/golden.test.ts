/**
 * Golden regression set: failures this factory really produced (and a few lines that must
 * keep passing). Every rule change has to keep these verdicts. Cases live in
 * tests/golden/cases.json and are checked against the shipped house standard and archetypes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calendarIssues, type ArchetypeLite } from "../src/lib/autopilot.ts";
import { classifyLicence, contextIssues } from "../src/lib/context.ts";
import { reelFrameFor } from "../src/lib/formats.ts";
import { lintStandard, type HouseStandard } from "../src/lib/house-standard.ts";
import { parsePostSpec } from "../src/schemas/post.ts";

type Case = { id: string; kind: string; expect?: string[]; lang?: "it" | "en"; where?: string; text?: string; count?: number; licence?: string; ok?: boolean; rotation?: string[]; hook?: string; scenes?: string[]; width?: number; height?: number; frame?: string };
const { cases } = JSON.parse(readFileSync("tests/golden/cases.json", "utf8")) as { cases: Case[] };
const standard = JSON.parse(readFileSync("content/house-standard.json", "utf8")) as HouseStandard;
const archetypes = (JSON.parse(readFileSync("content/archetypes.json", "utf8")) as { archetypes: ArchetypeLite[] }).archetypes;

// three short paragraphs: the house sets a caption like a page
const quiet = { caption: "Una tavola a Palermo.\n\nLo chef cucina a casa vostra.\n\nScriveteci su risthome.it", hook: "A casa vostra", scene: "", slideBody: "" };
const specWith = (c: Case) =>
  parsePostSpec({
    slug: "golden", lang: c.lang ?? "it", title: "golden",
    brief: { archetype: "A4-private-table", audience: "aud", objective: "obj", hook: "hook", sequence: ["a"], cta: "cta" },
    caption: c.where === "caption" ? c.text : quiet.caption,
    hashtags: c.where === "hashtags" ? Array.from({ length: c.count ?? 0 }, (_, i) => `tag${i}`) : ["palermo"],
    reel: {
      hook: { image: c.hook ?? "assets/pool/a.jpg", title: c.where === "hook" ? c.text : quiet.hook },
      scenes: (c.scenes ?? ["assets/pool/b.jpg"]).map((image) => ({ image, ...(c.where === "scene" ? { text: c.text } : {}) })),
      cta: { title: "RistHome" },
    },
    ...(c.where === "slideBody" ? { carousel: { slides: [{ type: "cover", image: "assets/pool/a.jpg", title: "A casa vostra" }, { type: "photo", image: "assets/pool/b.jpg", body: c.text }] } } : {}),
  });

for (const c of cases) {
  test(`golden ${c.kind}: ${c.id}`, () => {
    if (c.kind === "text") {
      const found = lintStandard(specWith(c), standard).map((v) => v.message);
      if (c.expect!.length === 0) assert.deepEqual(found, [], "this line must keep passing");
      for (const e of c.expect!) assert.ok(found.some((m) => m.includes(e)), `expected a "${e}" violation, got: ${found.join(" | ") || "none"}`);
    } else if (c.kind === "licence") {
      assert.equal(classifyLicence(c.licence!).ok, c.ok);
    } else if (c.kind === "calendar") {
      const found = calendarIssues(c.rotation!, archetypes, standard.calendar!).join(" | ");
      for (const e of c.expect!) assert.ok(found.includes(e), `expected "${e}", got: ${found}`);
    } else if (c.kind === "context") {
      const found = contextIssues(specWith(c), (image) => (image === "assets/context/1.jpg" ? null : undefined)).join(" | ");
      for (const e of c.expect!) assert.ok(found.includes(e), `expected "${e}", got: ${found}`);
    } else if (c.kind === "frame") {
      assert.equal(reelFrameFor(c.width!, c.height!), c.frame);
    } else {
      assert.fail(`unknown case kind ${c.kind}`);
    }
  });
}
