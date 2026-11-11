import { test } from "node:test";
import assert from "node:assert/strict";
import { publicTitle, captionFor, distribution, distributionFor, materialOf, parseChannels, postMetadata } from "../src/lib/channels.ts";

test("parseChannels reads the platform map and falls back to BUFFER_CHANNEL_ID", () => {
  assert.deepEqual(parseChannels({ BUFFER_CHANNELS: "instagram:a, tiktok:b,youtube:c" }), { instagram: "a", tiktok: "b", youtube: "c" });
  assert.deepEqual(parseChannels({ BUFFER_CHANNEL_ID: "ig" }), { instagram: "ig" });
  assert.throws(() => parseChannels({ BUFFER_CHANNELS: "twitter:x" }), /platform/);
  assert.deepEqual(parseChannels({}), {});
  assert.deepEqual(parseChannels({ BUFFER_CHANNELS: "instagram:,tiktok:,facebook:,youtube:" }), {}, "template placeholders mean: not connected yet");
});

test("reels go to four platforms staggered by an hour; carousels to Instagram and Facebook two days later", () => {
  assert.deepEqual(distribution.reel.map((d) => d.platform), ["instagram", "tiktok", "youtube", "facebook"]);
  assert.equal(distribution.carousel[0].offsetHours, 48);
});

test("captions adapt per platform", () => {
  const full = "Hook line.\n\nBody text.\n\n#palermo #risthome";
  assert.equal(captionFor("instagram", full, ["#palermo", "#risthome"], "Hook line."), full);
  assert.equal(captionFor("tiktok", full, ["#palermo", "#risthome"], "Hook line."), "Hook line.\n#palermo #risthome");
  assert.equal(captionFor("facebook", full, ["#palermo"], "Hook line."), "Hook line.\n\nBody text.");
});

test("the format follows the material: photographs lead with the carousel, real footage with the reel", () => {
  const stills = { hook: { image: "a.jpg" }, scenes: [{ image: "b.jpg" }, { video: "c.mp4" }, { video: "d.mp4" }] };
  const footage = { hook: { video: "a.mp4" }, scenes: [{ video: "b.mp4" }, { video: "c.mp4" }, { image: "d.jpg" }] };
  assert.equal(materialOf(stills), "stills");
  assert.equal(materialOf(footage), "video");
  assert.equal(materialOf(undefined), "stills");
  assert.deepEqual(distributionFor("video"), distribution);
  const d = distributionFor("stills");
  assert.deepEqual(d.carousel.map((x) => `${x.platform}+${x.offsetHours}`), ["instagram+0", "tiktok+1", "facebook+2"]);
  assert.deepEqual(d.reel.map((x) => `${x.platform}+${x.offsetHours}`), ["instagram+48"]);
});

test("post options carry the AI disclosure wherever the platform has one, and the publication is skipped where it has none", () => {
  const plain = { aiGenerated: false, title: "Il vostro tavolo" };
  const ai = { aiGenerated: true, title: "Il vostro tavolo" };
  assert.deepEqual(postMetadata("instagram", "carousel", plain), { instagram: { type: "post", shouldShareToFeed: true } });
  assert.deepEqual(postMetadata("instagram", "carousel", ai), { instagram: { type: "post", shouldShareToFeed: true, isAiGenerated: true } });
  assert.deepEqual(postMetadata("instagram", "reel", ai), { instagram: { type: "reel", shouldShareToFeed: true, isAiGenerated: true } });
  assert.deepEqual(postMetadata("tiktok", "reel", ai), { tiktok: { isAiGenerated: true } });
  assert.deepEqual(postMetadata("tiktok", "carousel", plain), { tiktok: { title: "Il vostro tavolo" } });
  assert.deepEqual(postMetadata("facebook", "carousel", plain), { facebook: { type: "post" } }, "Buffer requires the type on Facebook");
  assert.deepEqual(postMetadata("facebook", "reel", plain), { facebook: { type: "reel" } });
  for (const [platform, kind] of [["tiktok", "carousel"], ["facebook", "carousel"], ["facebook", "reel"], ["youtube", "reel"]] as const) {
    assert.equal(postMetadata(platform, kind, ai), null, `${platform} ${kind} cannot be disclosed, so it is not sent`);
  }
});

test("the opening line of a short caption is one the audience was shown, never the working title", () => {
  assert.equal(publicTitle({ title: "internal note", reel: { hook: { title: "A chef at your table" } } }), "A chef at your table");
  assert.equal(publicTitle({ title: "The island in November: sea cave, lemons", carousel: { slides: [{ type: "cover", title: "Sicily, in November." }] } }), "Sicily, in November.");
  assert.equal(publicTitle({ title: "only this" }), "only this");
});
