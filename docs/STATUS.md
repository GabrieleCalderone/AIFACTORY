# Status and verification report, 2026-11-06 (late night: volume strategy)

## Volume strategy added (docs/research-volume.md, ADR 0004)

- Research classified: Chinese AI micro-drama and matrix-account practices (volume with
  differentiation, persona, duplicate detection), platform enforcement against fake
  engagement and reposts, peer-reviewed evidence on frequency, cross-platform spillover
  and hooks.
- Implemented: daily cadence; chef series archetype A6 with episode numbering (verified:
  "Dalla cucina di Giacomo, ep. 1" authored and reviewed, then removed as a test); photo
  cooldown (no reuse within 8 posts, abort when fewer than 6 fresh photos); four-platform
  distribution through Buffer with staggered schedule and per-platform captions (dry run
  verified: 6 jobs for one post); metrics per platform in `data/publications.json`.
- Third security review applied: deny-by-default tools on every headless Claude call,
  reviewer text sanitised before re-prompting. 51 Node tests + 2 Python tests pass.
- Still denied to the automated session by the auto-mode classifier (twice each):
  creating the public media repo and installing the launchd agent. Both are one command
  for Gabriele (`bash scripts/setup-media-host.sh`, `bash scripts/install-autopilot.sh`).

## What exists now

Brief -> spec -> storyboard -> gate -> render (reel + carousel + cover + caption + QA
frames) -> publish pack -> metrics -> comparison -> report. Every step is a command in
`README.md`; nothing is published and nothing has been bought (EUR 0).

Deliverables of the "CREATIVE INTELLIGENCE UPGRADE" brief:

| Deliverable                            | Where                                                                                                                                                  | State                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Architecture decision record           | `docs/adr/0001`, `docs/adr/0002`                                                                                                                       | done                                         |
| Working creative intelligence pipeline | `scripts/*.ts`, `src/`                                                                                                                                 | done, verified below                         |
| Competitor/reference dataset schema    | `data/references.csv`, `data/references.schema.json`, `scripts/add-reference.ts`                                                                       | done (0 rows: manual, compliant import only) |
| Creative brief generator               | `scripts/new-post.ts` + `content/archetypes.json`                                                                                                      | done                                         |
| Five reusable creative archetypes      | `content/archetypes.json`                                                                                                                              | done                                         |
| Three completed sample creatives       | `out/pasta-class-palermo` (reel + 8 slides, EN), `out/chef-a-domicilio` (reel, IT), `out/eventi-finger-food` (8 slides, IT); plus variant B of EXP-001 | done, rendered and inspected                 |
| Analytics and experimentation schema   | `data/experiments.csv` (4 rows, metrics empty), `data/experiments.schema.json`, `scripts/log-metrics.ts`, `compare.ts`, `report.ts`                    | done                                         |
| Tests and verification report          | `tests/*.test.ts` (39), `tools/py/test_*.py` (2), this file                                                                                            | done                                         |
| Costed next-step roadmap               | `docs/roadmap.md`, `docs/higgsfield.md`                                                                                                                | done                                         |
| Research with classified sources       | `docs/research.md`                                                                                                                                     | done; Help Center limits still unread        |

Six capabilities: competitive intelligence (schema + manual import), knowledge base
(archetypes + performance report), planning (brief, storyboard), production (Remotion
templates, local camera moves, video scenes via FFmpeg), experimentation (variants,
experiment ids, hypotheses, gate, Wilson comparison), revenue intelligence (funnel
columns from reach to contribution margin, left empty until measured).

## Checks executed (2026-11-06)

| Check                              | Command                                                                                                                             | Result                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Lint + types                       | `npm run lint`                                                                                                                      | 0 errors                                                                                   |
| Node unit tests                    | `npm test`                                                                                                                          | 39 passed, 0 failed                                                                        |
| Python tests                       | `npm run test:py`                                                                                                                   | 2 passed                                                                                   |
| Data validation                    | `npm run validate:data`                                                                                                             | 4 experiment rows valid, 0 references                                                      |
| Quality gate                       | `node scripts/gate.ts content/posts/*.json`                                                                                         | 4 PASS; warnings: silent reels (3), one 2.1x upscale                                       |
| Full render                        | `node scripts/render.ts --all --qa`                                                                                                 | 4 posts, no errors                                                                         |
| ffprobe                            | reels                                                                                                                               | pasta-class A and B: h264 1080x1920 600 frames 20.0 s; chef-a-domicilio: 528 frames 17.6 s |
| Visual QA                          | 23 reel frames + 24 slides inspected                                                                                                | correct media, legible text in safe areas                                                  |
| Video scene path                   | temporary post with a real phone clip (480x848 -> 1080x1920 via FFmpeg), rendered at 0.5 scale, frames inspected, artifacts removed | works                                                                                      |
| Storyboards, publish packs, report | `storyboard.ts`, `publish-pack.ts`, `report.ts` on all posts                                                                        | written to `out/<slug>/` and `docs/performance.md`                                         |
| Security review follow-up          | adapter URL confinement, media path traversal, CSV formula injection, fail-closed consent                                           | fixed with tests                                                                           |

## Automation added (see docs/automation.md, ADR 0003)

- Photo catalogue by headless Claude (117 photos: 95 none, 8 chef, 14 guests; spot-checked),
  consent-filtered pool of 102 (printed logos and small photos excluded at authoring).
- `author.ts`: Claude writes brief and texts from the photo descriptions, second pass
  reviews each photo against its text and rewrites unsupported claims (verified twice:
  "tagliatelle"/"pasta ripiena" and "fried" rice balls were corrected automatically).
- `publish.ts` (Buffer, dry run without keys), `sync-metrics.ts`, `host-media.ts`
  (GitHub Pages, dry run available), `autopilot.ts` + `src/lib/autopilot.ts` (tested),
  `install-autopilot.sh` (launchd), `setup-media-host.sh`.
- Forced dry-run cycle on 2026-11-06: `a1-20261106` authored, reviewed, rendered, hosted
  (dry) and scheduled (dry) in 88 s. 47 Node tests + 2 Python tests pass.

## Open work

Two one-time account actions the automated session could not perform (the tool policy
denied creating a public repo and installing a launchd agent):

1. `bash scripts/setup-media-host.sh` (creates the public GitHub Pages repo).
2. Buffer: create the account, connect Instagram, create an API key, put
   `BUFFER_API_KEY` and `BUFFER_CHANNEL_ID` in `.env` (`npm run buffer:channels` lists ids).
3. `bash scripts/install-autopilot.sh` (daily 10:30). Until then: `npm run autopilot -- --force`.

Everything else runs without a human: the sample posts of today and the automated
`a1-20261106` are rendered and ready in `out/`.

## Earlier open items (now automated or superseded)

1. Approve texts and business claims ("preventivo in 24 ore", "English spoken",
   "ville, resort e location in tutta la Sicilia") before posting.
2. Post the three samples by hand with a licensed track chosen in the Instagram editor
   (`out/<slug>/publish.json` has the checklist and the UTM bio link), then
   `npm run log-metrics` after 7 days and `npm run compare` / `npm run report`.
3. Read reel length and carousel limits on help.instagram.com from a browser (the
   fetcher got an empty page) and record them in `docs/research.md`.
4. Shoot vertical clips to replace the two soft photos (chef in the garden 720x1560,
   parmigiana 989x914).
5. Decisions in `docs/roadmap.md`: connect Buffer (free), Meta app for metrics, first
   generative spend (Higgsfield estimate first). None started.
