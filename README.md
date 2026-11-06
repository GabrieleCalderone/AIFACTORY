# RistHome AI Content Factory

Data-driven Instagram Reels (1080x1920) and carousels (1080x1350) for RistHome, rendered
with Remotion from the business's own photos. One JSON spec per post holds the brief
(audience, objective, hook, sequence, CTA, hypothesis) and the render data, so every
output stays linked to the idea it tests.

## Commands

```bash
npm install                       # once; Node >= 24 runs the TypeScript scripts natively
uv sync                           # once; Python helpers (Pillow)
npm run check                     # eslint + tsc + unit tests (Node and Python)
npm run render -- content/posts/pasta-class-palermo.json --qa   # one post
npm run render:all                # every post in content/posts
npm run dev                       # Remotion Studio preview (compositions "Reel", "CarouselSlide")
```

Outputs land in `out/<slug>/`: `reel.mp4`, `carousel-NN.jpg`, `caption.txt`,
`manifest.json` (ffprobe data, scene timings, spec hash, warnings) and `qa/*.png`
(one frame per scene) when `--qa` is passed. Open them with `open out/<slug>`.

## Layout

| Path | Role |
|------|------|
| `content/posts/*.json` | post specs (brief + reel + carousel + caption) |
| `content/archetypes.json` | five reusable creative archetypes used by `scripts/new-post.ts` |
| `content/README.md` | spec format, workflow, brief-to-spec prompt |
| `src/schemas/post.ts` | Zod schema (single source of truth) |
| `src/lib/timeline.ts`, `src/lib/formats.ts` | pure timeline math and output formats |
| `src/compositions/Reel.tsx`, `CarouselSlide.tsx` | the two templates |
| `src/components/MotionImage.tsx` | local camera moves (dolly, crash zoom, arc, pan, zoom) |
| `scripts/render.ts` | render CLI with quality gates and manifests |
| `scripts/new-post.ts` | creative brief generator (scaffold from an archetype) |
| `tools/py/prepare_assets.py` | normalise photos into `public/assets/<slug>/` (git-ignored) |
| `tools/py/contact_sheet.py` | labelled contact sheets to pick photos |
| `tools/py/compare_variants.py` | small-sample comparison of experiment variants |
| `data/experiments.csv`, `data/references.csv` (+ `.schema.json`) | experiment and reference datasets |
| `docs/adr/0001-*.md`, `docs/higgsfield.md`, `docs/analytics-and-experiments.md`, `docs/STATUS.md` | decisions, research, process, verification report |

## Rules

EUR 0 incremental spend; no autopublishing; real RistHome assets only; texts describe
what the photos show; no guest faces without consent; metrics are measured, never
estimated. See `docs/analytics-and-experiments.md`.
