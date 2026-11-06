# Content specs

One JSON file per post in `content/posts/<slug>.json`. The schema is `src/schemas/post.ts`
(Zod); the render CLI and the tests validate against it.

## Fields

| Field | Meaning |
|-------|---------|
| `slug`, `lang`, `title` | identity; `lang` is `it` or `en` and drives micro-copy (Swipe/Scorri) |
| `brief` | strategy, written first: `archetype` (id from `content/archetypes.json`), `audience`, `objective`, `hook`, `sequence` (beats), `cta`, `hypothesis`, `experimentId`, `variantId` |
| `caption`, `hashtags` | Instagram caption (max 2200 chars) and up to 30 tags; `caption.txt` is generated |
| `reel` | `hook` {image or video, trimSec, title, subtitle, durationSec, motion}, `scenes[]` {image or video, trimSec, label, text, durationSec, motion}, `cta` {title, line, durationSec}, `transitionSec`, optional `audio` {src, volume, fadeOutSec} |
| `carousel` | `slides[]` of type `cover` {image, kicker, title}, `photo` {image, title, body}, `text` {title, body}, `cta` {title, body, image?} |

Images and clips are paths under `public/` (`assets/<slug>/01-....jpg`, `.mp4`). Camera
moves for stills: `zoom-in`, `zoom-out`, `pan-left`, `pan-right`, `dolly-in`,
`crash-zoom-in`, `arc-left`, `arc-right`. Clips loop muted and fill the frame.

## Workflow for a new post

```bash
# 1. pick photos/clips (the business's own) and normalise them; record who is visible
npm run assets -- <slug> --src "/path/to/photos" --pick IMG_0001.JPG IMG_0002.JPG --people chef
npm run clips  -- <slug> --src "/path/to/clips" --pick VID_0001.mp4 --max-seconds 6 --people chef
# 2. scaffold the spec from an archetype (fills media, leaves TODO texts)
npm run new-post -- <slug> --archetype A1-process-reveal --lang en --experiment EXP-004
# 3. write the brief and the texts (by hand or with the prompt below), faithful to the media
# 4. storyboard for approval, then gate
npm run storyboard -- content/posts/<slug>.json && npm run gate -- content/posts/<slug>.json
# 5. render and inspect out/<slug>/qa/*.png and the slides
npm run render -- content/posts/<slug>.json --qa
# 6. add the experiment row (variant.ts does it for variants; for a new experiment edit data/experiments.csv),
#    build the hand-off package, get approval, post by hand, then log metrics after 7 days
npm run publish-pack -- content/posts/<slug>.json
npm run log-metrics -- EXP-004 A --reach ... --plays ... --saves ...
```

To test one change, clone a variant instead of editing the original:
`npm run variant -- content/posts/<slug>.json B --set reel.hook.title="..."`.

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
