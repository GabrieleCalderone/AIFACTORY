# ADR 0001: RistHome AI Content Factory architecture

Status: accepted, 2026-11-06. Supersedes the empty Remotion scaffold of 2026-11-05.

## Context

RistHome (private chef and cooking classes, Palermo) needs Instagram Reels and carousels
produced repeatedly from its own photos, under EUR 0 incremental spend now and EUR 20/month
later, with no autopublishing and no fabricated metrics. The brief "STATE-OF-THE-ART
CREATIVE INTELLIGENCE UPGRADE" (2026-11-05) asks for six capabilities: competitive
intelligence, creative knowledge base, creative planning, multimodal production,
experimentation and revenue intelligence.

## Decision

1. **One JSON spec per post** (`content/posts/<slug>.json`, validated by Zod in
   `src/schemas/post.ts`). The spec carries the *brief* (audience, objective, hook, beat
   sequence, CTA, hypothesis, experiment and variant ids) next to the render data, so
   strategy is written before any pixel is produced and every output stays linked to
   its hypothesis.
2. **Two Remotion templates** driven by that spec: `Reel` (1080x1920, 30 fps, scenes
   with camera moves, fade transitions, CTA card) and `CarouselSlide` (1080x1350 still;
   cover / photo / text / cta slide types). Duration is derived from the spec by pure
   timeline math (`src/lib/timeline.ts`), which is unit-tested.
3. **Camera moves re-created locally.** Higgsfield "Camera Controls" presets that fit
   food photography (Dolly In, Crash Zoom In, Arc Left/Right) are implemented as 2D/2.5D
   transforms on still photos in `src/components/MotionImage.tsx`. No external
   generation service is called; see `docs/higgsfield.md` for the costed option.
4. **Real assets only.** Photos come from the business's own folders, are normalised by
   `tools/py/prepare_assets.py` (EXIF rotation, resize, metadata stripped) into
   `public/assets/<slug>/` (git-ignored because they may contain people). A quality gate
   in the render script fails on missing files and warns on >2x upscaling.
5. **One command to render**: `node scripts/render.ts <spec> [--qa]` bundles once, renders
   the reel (H.264), the slides (JPEG), the caption and a manifest with ffprobe data and
   per-scene QA frames. Node 26 runs the TypeScript scripts natively; no extra toolchain.
6. **Knowledge base and experiments as files**: `content/archetypes.json` (five archetypes
   with hook type, narrative, format recipe, platform adaptations, quality gates, KPIs),
   `data/experiments.csv` (one row per variant, metrics left blank until measured),
   `data/references.csv` (permitted public references, manual import only) and
   `tools/py/compare_variants.py` (small-sample-aware comparison with Wilson intervals).

## Alternatives considered

- Reusing `~/Projects/sovereign-media`: an empty Remotion 4.0.513 skeleton with no
  compositions; nothing to reuse beyond the folder idea.
- Calling Higgsfield / fal / Replicate for motion: deferred; costs are pay-per-request and
  plan prices were not readable from the fetched pricing page. Local presets cover the
  three moves the material needs.
- Buffer or Meta API publishing: deferred; the brief forbids autopublishing without
  approval and no account is connected.
- Tailwind: not used; inline styles keep the two templates self-contained.

## Consequences

- Adding a post is: prepare assets, `node scripts/new-post.ts`, fill the TODOs, render.
- Every render is reproducible from the spec (sha256 in the manifest).
- Guest faces must not be used without written consent; the quality gates say so and the
  three sample creatives use only the chef and food.
- Package `type: module` and `allowImportingTsExtensions` were enabled so Node can run
  `scripts/*.ts` and `tests/*.test.ts` without a build step.
