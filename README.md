# RistHome Content Intelligence OS

Media intelligence, content production, controlled publishing and measurement for
RistHome (private chef and cooking classes, Palermo). Real photos are ranked by a
Visual Quality & Brand Fit Engine, headless Claude writes and reviews every text, Remotion
renders reels (1080x1920) and carousels (1080x1350) with product looks, Buffer schedules
them on four platforms once approved, metrics flow back into experiments and a revenue view.
Spend: EUR 0 unless a generative budget is set.

## Start

```bash
npm install && uv sync          # once
npm run dashboard               # console at http://127.0.0.1:4747/?t=<session token>
npm run check                   # eslint + tsc + 69 Node tests + Python tests + data validation
```

Italian startup guide: `docs/GUIDA-AVVIO.md`. How the loop works: `docs/automation.md`.

## Commands

```bash
# media intelligence
npm run describe-assets -- --src "/photos"      # vision catalogue (people, subject, aesthetic, premium, service/format fit)
npm run build-pool                               # consent-filtered pool
npm run score-assets                             # technical analysis + Q per service/format + tiers + reasons
npm run registry-sync                            # unified media registry (sha256, sources, licence, provenance)

# production
npm run autopilot -- --dry-run --force           # plan -> select -> author -> review -> gate -> render -> host (dry) -> publish (dry)
npm run author -- --archetype A6-chef-series --lang it --experiment EXP-006
npm run render -- content/posts/<slug>.json --qa
npm run storyboard -- content/posts/<slug>.json
npm run gate -- content/posts/<slug>.json --strict

# publishing (manual approval until AUTOPUBLISH=true)
npm run host -- content/posts/<slug>.json        # GitHub Pages or R2 (MEDIA_STORE=r2)
npm run publish -- content/posts/<slug>.json --draft      # Buffer drafts
npm run publish-post -- content/posts/<slug>.json         # schedule at the next slot (needs APPROVED)
npm run sync-metrics && npm run report

# generative studio (REAL-FIRST, budget-gated)
npm run studio -- --model higgsfield-ai/soul/v2/standard --prompt "..."          # estimate
npm run studio -- --model ... --prompt "..." --run                               # generate within the monthly cap

# experiments
npm run variant -- content/posts/<slug>.json B --set reel.hook.title="..."
npm run compare -- EXP-001 --metric saves --base reach
npm run log-metrics -- EXP-001 A --reach 1200 --plays 950 --saves 31
```

## Layout

| Path                                                                                                                     | Role                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/lib/visual-score.ts`, `tools/py/analyze_assets.py`, `scripts/describe-assets.ts`, `scripts/score-assets.ts`         | Visual Quality & Brand Fit Engine                                                                                    |
| `src/lib/pipeline.ts`, `data/pipeline.json`                                                                              | editorial state machine with evidence                                                                                |
| `src/lib/registry.ts`, `data/media-registry.json`                                                                        | unified media registry                                                                                               |
| `src/adapters/buffer.ts`, `higgsfield.ts`, `r2.ts`, `genai.ts`                                                           | publishing, generation, storage adapters                                                                             |
| `src/compositions/`, `src/components/`, `src/brand/looks.ts`                                                             | Reel and CarouselSlide templates with product looks                                                                  |
| `scripts/author.ts`, `autopilot.ts`, `publish.ts`, `host-media.ts`, `sync-metrics.ts`, `genai-studio.ts`, `dashboard.ts` | pipeline and console                                                                                                 |
| `content/`                                                                                                               | post specs, archetypes, brand facts, products, audio                                                                 |
| `data/`                                                                                                                  | catalogue, technical analysis, scores, overrides, usage, experiments, publications, pipeline, registry, spend ledger |
| `docs/`                                                                                                                  | ADR 0001-0005, research, automation, Italian guide, performance report, STATUS                                       |

## Rules

Real RistHome media first; guests never without recorded consent; texts describe what the
photos show and only the brand facts; produced is never reported as published; no bots,
no reposts, no bought views; synthetic media stays marked and never impersonates reality.
