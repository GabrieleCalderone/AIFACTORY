import type { PostSpecInput } from "../../src/schemas/post.ts";

export const demoSpec: PostSpecInput = {
  slug: "demo-post",
  lang: "en",
  title: "Demo post",
  brief: {
    archetype: "A1-process-reveal",
    audience: "English-speaking travellers in Palermo",
    objective: "Class bookings",
    hook: "Chef at work plus a promise",
    sequence: ["Hook", "Step 1", "Step 2", "CTA"],
    cta: "Book on risthome.it",
    hypothesis: "Process beats montage on watch time",
    experimentId: "EXP-001",
    variantId: "A",
  },
  caption: "Learn to make fresh pasta in Palermo.",
  hashtags: ["palermo", "#cookingclass"],
  reel: {
    hook: { image: "assets/demo/01.jpg", title: "Make pasta like a Sicilian nonna", subtitle: "Palermo, 2 hours" },
    scenes: [
      { image: "assets/demo/02.jpg", text: "Busiate, ravioli or cannoli" },
      { image: "assets/demo/03.jpg", text: "Then dinner with Sicilian wine", durationSec: 3 },
    ],
    cta: { title: "Book on risthome.it", line: "Link in bio" },
  },
  carousel: {
    slides: [
      { type: "cover", image: "assets/demo/01.jpg", title: "3 things you cook in our class", kicker: "Palermo" },
      { type: "photo", image: "assets/demo/02.jpg", title: "Busiate", body: "Hand-rolled pasta from Trapani" },
      { type: "text", title: "2 hours, max 8 guests", body: "Then dinner together" },
      { type: "cta", title: "Book on risthome.it" },
    ],
  },
};
