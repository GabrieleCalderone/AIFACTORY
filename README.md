# RistHome AI Content Factory

Evidence-driven Instagram Reels (1080x1920) and carousels (1080x1350) for RistHome,
rendered with Remotion from the business's own photos and clips. One JSON spec per post
holds the brief (audience, objective, hook, sequence, CTA, hypothesis, experiment and
variant ids) and the render data, so every output stays linked to the idea it tests and
to the metrics it earns.

## Commands

```bash
npm install && uv sync              # once (Node >= 24, uv for the Python helpers)
npm run check                       # eslint + tsc + 36 Node tests + Python tests + data validation

# produce
npm run assets -- <slug> --src "/photos" --pick IMG_1.JPG IMG_2.JPG --people chef   # normalise photos
npm run clips  -- <slug> --src "/clips" --pick VID_1.mp4 --max-seconds 6            # normalise clips (FFmpeg)
npm run new-post -- <slug> --archetype A1-process-reveal --lang en --experiment EXP-004
npm run storyboard -- content/posts/<slug>.json                                       # HTML/MD for approval
npm run gate -- content/posts/<slug>.json [--strict]                                  # quality gate only
npm run render -- content/posts/<slug>.json --qa                                      # reel + slides + cover + caption + QA frames
npm run render:all -- --qa
npm run publish-pack -- content/posts/<slug>.json [--schedule 2026-11-12T18:00:00+01:00]

# experiment
npm run variant -- content/posts/<slug>.json B --set reel.hook.title="..."           # clone + experiment row
npm run log-metrics -- EXP-001 A --reach 1200 --plays 950 --saves 31 --post-url https://...
npm run compare -- EXP-001 --metric saves --base reach                                # Wilson intervals
npm run report                                                                        # docs/performance.md
npm run add-reference -- --url https://... --platform instagram --format reel --hook-type promise --narrative list --pattern "..."
npm run validate:data

# automation (docs/automation.md)
npm run describe-assets -- --src "/photos"     # Claude catalogues photos: people, subject, tags, quality
npm run build-pool                              # consent-filtered pool with descriptions
npm run author -- --archetype A1-process-reveal --lang en --experiment EXP-005   # Claude writes a spec from the photos, reviews it against them
npm run autopilot -- --dry-run --force          # plan -> author -> render -> host -> publish (dry run without keys)
bash scripts/setup-media-host.sh                # one-time: public GitHub Pages media repo
bash scripts/install-autopilot.sh               # one-time: daily launchd agent (10:30)
npm run buffer:channels                         # one-time: find BUFFER_CHANNEL_ID after setting BUFFER_API_KEY

# preview and cost checks
npm run dev                         # Remotion Studio ("Reel", "CarouselSlide")
npm run estimate -- --model higgsfield-ai/soul/v2/standard --prompt "..."             # dry run unless keys in .env
```

Outputs per post in `out/<slug>/`: `reel.mp4`, `reel-cover.jpg`, `carousel-NN.jpg`,
`caption.txt`, `manifest.json` (ffprobe, scene timings, spec hash, gate warnings),
`qa/*.png`, `storyboard.html`, `publish.json`. Open with `open out/<slug>`.

## Layout

| Path | Role |
|------|------|
| `content/posts/*.json` | post specs (brief + reel + carousel + caption); samples: pasta-class-palermo (+ variant b), chef-a-domicilio, eventi-finger-food |
| `content/archetypes.json` | five archetypes: hook type, narrative, format recipe, platform adaptations, quality gates, KPIs |
| `content/README.md` | spec format, workflow, brief-to-spec prompt |
| `src/schemas/` | Zod schemas: post, experiment row, reference row |
| `src/lib/` | timeline math, formats, CSV, data access, stats (Wilson), quality gate, variant helpers |
| `src/compositions/`, `src/components/` | Reel and CarouselSlide templates; MotionImage (camera moves), MotionVideo, Scrim, Reveal, Chip, Brandmark |
| `src/adapters/genai.ts`, `src/adapters/buffer.ts` | estimate-only Higgsfield adapter + budget policy; Buffer GraphQL client (schedule posts, read metrics) |
| `src/lib/autopilot.ts` | planning rules (cadence, rotation, variant B after A is measured) |
| `content/brand-facts.json`, `content/audio.json` | the only claims the author may use; CC BY tracks with credits |
| `data/asset-catalog.json`, `data/asset-usage.json`, `data/publications.json`, `data/autopilot.json` | photo catalogue (people/subject), usage ledger, Buffer post ids, scheduler state |
| `scripts/` | render, gate, storyboard, new-post, variant, publish-pack, log-metrics, compare, report, add-reference, validate-data, estimate-genai, describe-assets, build-pool, author, host-media, publish, sync-metrics, autopilot, buffer-channels, setup-media-host.sh, install-autopilot.sh |
| `tools/py/` | prepare_assets, prepare_clips (FFmpeg), contact_sheet, logo_trim |
| `data/` | experiments.csv, references.csv and their JSON schemas |
| `docs/` | ADRs, research (classified), Higgsfield dossier, analytics process, performance report, roadmap, STATUS |

## Rules

EUR 0 incremental spend (cap EUR 20/month); publishing is automated through Buffer once
the keys are in `.env` (docs/automation.md); real RistHome assets only, guests excluded by
the catalogue; texts describe what the media shows (Claude review pass); metrics are
measured, never estimated.
