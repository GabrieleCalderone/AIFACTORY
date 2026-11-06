import { test } from "node:test";
import assert from "node:assert/strict";
import { captionFor, distribution, parseChannels } from "../src/lib/channels.ts";

test("parseChannels reads the platform map and falls back to BUFFER_CHANNEL_ID", () => {
  assert.deepEqual(parseChannels({ BUFFER_CHANNELS: "instagram:a, tiktok:b,youtube:c" }), { instagram: "a", tiktok: "b", youtube: "c" });
  assert.deepEqual(parseChannels({ BUFFER_CHANNEL_ID: "ig" }), { instagram: "ig" });
  assert.throws(() => parseChannels({ BUFFER_CHANNELS: "twitter:x" }), /platform/);
  assert.deepEqual(parseChannels({}), {});
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
