# Content specs

One JSON file per post in `content/posts/<slug>.json`. The schema is `src/schemas/post.ts`
(Zod); the render CLI and the tests validate against it.

## Fields

| Field | Meaning |
|-------|---------|
| `slug`, `lang`, `title` | identity; `lang` is `it` or `en` and drives micro-copy (Swipe/Scorri) |
| `brief` | strategy, written first: `archetype` (id from `content/archetypes.json`), `audience`, `objective`, `hook`, `sequence` (beats), `cta`, `hypothesis`, `experimentId`, `variantId` |
| `caption`, `hashtags` | Instagram caption (max 2200 chars) and up to 30 tags; `caption.txt` is generated |
| `reel` | `hook` {image, title, subtitle, durationSec, motion}, `scenes[]` {image, label, text, durationSec, motion}, `cta` {title, line, durationSec}, `transitionSec`, optional `audio` {src, volume, fadeOutSec} |
| `carousel` | `slides[]` of type `cover` {image, kicker, title}, `photo` {image, title, body}, `text` {title, body}, `cta` {title, body, image?} |

Images are paths under `public/` (`assets/<slug>/01-....jpg`). Camera moves: `zoom-in`,
`zoom-out`, `pan-left`, `pan-right`, `dolly-in`, `crash-zoom-in`, `arc-left`, `arc-right`.

## Workflow for a new post

```bash
# 1. pick photos (the business's own, no guest faces without consent) and normalise them
npm run assets -- <slug> --src "/path/to/photos" --pick IMG_0001.JPG IMG_0002.JPG
# 2. scaffold the spec from an archetype (fills images, leaves TODO texts)
node scripts/new-post.ts <slug> --archetype A1-process-reveal --lang en --experiment EXP-004
# 3. write the brief and the texts (by hand or with the prompt below), faithful to the photos
# 4. render and inspect out/<slug>/qa/*.png and the slides
npm run render -- content/posts/<slug>.json --qa
# 5. add the row to data/experiments.csv (metrics empty) and get approval before posting
```

## Prompt template: brief to spec (model-agnostic)

Paste into ChatGPT or Claude together with the archetype entry and the asset manifest
(`public/assets/<slug>/manifest.json`), then validate with `npm run render`.

```
You write Instagram content for RistHome (private chef and cooking classes, Palermo).
Archetype: <paste the JSON object from content/archetypes.json>
Photos available (file, size, what it shows): <paste manifest.json plus one line per photo describing it>
Brief: audience=<...>; objective=<...>; hook idea=<...>; CTA=<...>; language=<it|en>.
Rules: every on-screen text must describe only what its photo shows; no prices, dates or
claims the chef has not confirmed; hook title max 80 characters, scene text max 90,
carousel body max 220; caption max 2200 characters; return ONLY a JSON object that
matches the schema in content/README.md, with brief.hypothesis written as a testable
sentence with a success threshold.
```
