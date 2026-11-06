# Status and verification report, 2026-11-06

## Delivered in this session

- Pipeline brief -> spec -> Reel MP4 (1080x1920, H.264, 30 fps) + carousel JPEGs
  (1080x1350) + caption + manifest, one command: `npm run render -- <spec> --qa`.
- Three sample creatives rendered from the business's own photos
  (`/Users/gabrielecalderone/Desktop/IDEE/FOTORISTHOME`, chef and food only):
  - `pasta-class-palermo` (EN, archetype A1): reel 20.0 s (600 frames) + 8 slides.
  - `chef-a-domicilio` (IT, archetype A4): reel 17.6 s (528 frames).
  - `eventi-finger-food` (IT, archetype A3): 8 slides.
- Local camera presets inspired by Higgsfield Camera Controls (dolly-in, crash-zoom-in,
  arc-left/right) in `src/components/MotionImage.tsx`; research and costed option in
  `docs/higgsfield.md`.
- Five archetypes (`content/archetypes.json`), brief generator (`scripts/new-post.ts`),
  experiment and reference schemas (`data/`), small-sample comparison tool.

## Checks executed (all on 2026-11-06)

| Check | Command | Result |
|-------|---------|--------|
| Lint + types | `npm run lint` (eslint src scripts tests && tsc) | 0 errors |
| Unit tests (Node) | `npm test` | 14 passed, 0 failed |
| Unit tests (Python) | `npm run test:py` | 5 passed |
| Compositions load | `npx remotion compositions` | Reel 600 frames 20.00 s, CarouselSlide still |
| Full render | `node scripts/render.ts --all --qa` | 3 posts, 43 s wall clock, no errors |
| ffprobe reel 1 | `ffprobe out/pasta-class-palermo/reel.mp4` | h264 1080x1920 30/1 600 frames 20.000 s yuv420p 10.2 MB |
| ffprobe reel 2 | `ffprobe out/chef-a-domicilio/reel.mp4` | h264 1080x1920 30/1 528 frames 17.600 s 8.3 MB |
| Visual QA | 15 reel frames + 16 slides inspected | correct photos, legible text, inside safe areas; three texts corrected for fidelity, one wrong photo (clams instead of cones) replaced, two baked-in logo bands cropped |
| Brief generator | `node scripts/new-post.ts smoke-test --archetype A2-chef-at-work --lang it` | valid spec with 5 scenes (file removed after the check) |

Quality-gate warning still open: `chef-a-domicilio` scene 2 photo (IMG_0055, 989x914) is
upscaled 2.1x; the hook photo (IMG_0071, 720x1560) is 1.5x. Both acceptable on phones,
better originals would help.

## Not done / open

- Nothing was published, no social account connected, no credit bought (EUR 0 spent).
- Metrics columns in `data/experiments.csv` are empty by design until the posts go live.
- Research gaps from the interrupted session: Meta/TikTok official ranking docs, short-form
  retention evidence, Buffer API, AI image/video economics were fetched as raw HTML on
  2026-11-05 (scratchpad of that session) but only the Higgsfield subset was digested.
- Business facts used in texts to confirm with Chef Giacomo before posting: "quote within
  24 hours", "villas, resorts and venues across Sicily", "English spoken".
- Music: reels are silent; add a licensed track in the Instagram editor at posting time or
  provide a licensed file via the optional `reel.audio` field.
- Competitive-intelligence import is a schema plus a manual process; no automation (the
  brief forbids unauthorized scraping).
- Optional: a `video` scene type for the five phone clips (480x848, too small today).
