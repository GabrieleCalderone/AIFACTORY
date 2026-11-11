import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLicence, contextIssues, creditLine, isContext, plainName, prepareContext } from "../src/lib/context.ts";
import { buildCaption } from "../src/lib/timeline.ts";
import { parsePostSpec } from "../src/schemas/post.ts";

test("only CC0, public domain and CC BY are accepted", () => {
  assert.deepEqual(classifyLicence("CC0"), { ok: true, kind: "cc0", needsCredit: false });
  assert.deepEqual(classifyLicence("Public domain"), { ok: true, kind: "public-domain", needsCredit: false });
  assert.deepEqual(classifyLicence("CC BY 4.0"), { ok: true, kind: "by", needsCredit: true });
  assert.equal(classifyLicence("CC BY 3.0 de").ok, true);
  for (const refused of ["CC BY-SA 4.0", "CC BY-SA 3.0 at", "CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 4.0", "GFDL", "Copyrighted free use", "", "All rights reserved"]) {
    assert.equal(classifyLicence(refused).ok, false, refused);
  }
  assert.equal(classifyLicence("CC BY-SA 4.0").why, "share-alike");
});

test("author names are reduced to plain text and the credit names author, licence and library", () => {
  assert.equal(plainName('<a href="//commons.wikimedia.org/wiki/User:X" title="User:X">Mario Rossi</a> &amp; <script>x</script>'), "Mario Rossi x");
  assert.equal(creditLine("<b>Mario Rossi</b>", "CC BY 4.0", "Wikimedia Commons"), "Mario Rossi, CC BY 4.0, via Wikimedia Commons");
  assert.equal(creditLine("", "CC0", "Wikimedia Commons"), "unknown author, CC0, via Wikimedia Commons");
});

const base = () => ({
  slug: "t", lang: "it", title: "t",
  brief: { archetype: "A4-private-table", audience: "aud", objective: "obj", hook: "hook", sequence: ["a"], cta: "cta" },
  caption: "Una tavola a Palermo.", hashtags: ["palermo"],
  reel: {
    hook: { image: "assets/pool/a.jpg", title: "A casa vostra" },
    scenes: [{ image: "assets/context/1.jpg" }, { image: "assets/pool/b.jpg", label: "Primo" }, { image: "assets/pool/c.jpg", label: "Dolce" }],
    cta: { title: "RistHome" },
  },
  credits: ["Mario Rossi, CC BY 4.0, via Wikimedia Commons"],
});
const credits: Record<string, string | null> = { "assets/context/1.jpg": "Mario Rossi, CC BY 4.0, via Wikimedia Commons", "assets/context/2.jpg": null, "assets/context/3.jpg": null };
const creditOf = (image: string) => credits[image];

test("a context scene between the house's own opening and closing pictures is accepted", () => {
  assert.equal(isContext("assets/context/1.jpg"), true);
  assert.equal(isContext("assets/pool/a.jpg"), false);
  assert.deepEqual(contextIssues(parsePostSpec(base()), creditOf), []);
});

test("context pictures never open or close a reel, never carry a label, and stay few", () => {
  const hook = base();
  hook.reel.hook.image = "assets/context/2.jpg";
  assert.match(contextIssues(parsePostSpec(hook), creditOf).join(" | "), /opening picture must be the house's own/);
  const last = base();
  last.reel.scenes[2] = { image: "assets/context/2.jpg" };
  assert.match(contextIssues(parsePostSpec(last), creditOf).join(" | "), /reel scene 3: the last picture must be the house's own/);
  const labelled = base();
  labelled.reel.scenes[0] = { image: "assets/context/1.jpg", label: "Antipasto" } as never;
  assert.match(contextIssues(parsePostSpec(labelled), creditOf).join(" | "), /carries no label/);
  const many = base();
  many.reel.scenes = [{ image: "assets/context/1.jpg" }, { image: "assets/context/2.jpg" }, { image: "assets/context/3.jpg" }, { image: "assets/pool/c.jpg", label: "Dolce" }];
  assert.match(contextIssues(parsePostSpec(many), creditOf).join(" | "), /3 context pictures, at most 2/);
});

test("an unapproved picture and a missing credit are refused", () => {
  const unknown = base();
  unknown.reel.scenes[0] = { image: "assets/context/999.jpg" };
  assert.match(contextIssues(parsePostSpec(unknown), creditOf).join(" | "), /999\.jpg: not an approved context picture/);
  const noCredit = base();
  noCredit.credits = [];
  assert.match(contextIssues(parsePostSpec(noCredit), creditOf).join(" | "), /missing photo credit in the caption: Mario Rossi/);
});

test("a carousel takes one context picture, on a photo slide without a title, never on the cover", () => {
  const spec = {
    ...base(), reel: undefined,
    carousel: { slides: [{ type: "cover", image: "assets/context/2.jpg", title: "A casa vostra" }, { type: "photo", image: "assets/context/1.jpg", title: "Limoni" }, { type: "cta", title: "RistHome" }] },
  };
  const got = contextIssues(parsePostSpec(spec), creditOf).join(" | ");
  assert.match(got, /slide 1: a cover slide must use the house's own picture/);
  assert.match(got, /slide 2: a context picture carries no title/);
});

test("prepareContext strips labels and titles from context pictures and returns the credits owed once", () => {
  const raw = { reel: { scenes: [{ image: "assets/context/1.jpg", label: "Step 1", text: "Sicilia" }, { image: "assets/pool/b.jpg", label: "Primo" }, { image: "assets/context/1.jpg" }] }, carousel: { slides: [{ type: "photo", image: "assets/context/2.jpg", title: "Mare" }] } };
  assert.deepEqual(prepareContext(raw, creditOf), ["Mario Rossi, CC BY 4.0, via Wikimedia Commons"]);
  assert.deepEqual(raw.reel.scenes[0], { image: "assets/context/1.jpg", text: "Sicilia" });
  assert.equal(raw.reel.scenes[1].label, "Primo");
  assert.equal("title" in raw.carousel.slides[0], false);
});

test("photo credits are printed in the caption after the music credit", () => {
  const caption = buildCaption({ caption: "Testo.", hashtags: ["#palermo"], credits: ["Mario Rossi, CC BY 4.0, via Wikimedia Commons"], reel: { audio: { attribution: "Song, CC BY 4.0" } } });
  assert.equal(caption, "Testo.\n\nMusic: Song, CC BY 4.0\nPhoto: Mario Rossi, CC BY 4.0, via Wikimedia Commons\n\n#palermo");
});
