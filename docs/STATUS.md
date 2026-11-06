# Status and verification report, 2026-11-06 (end of day)

## What exists now

Brief -> spec -> storyboard -> gate -> render (reel + carousel + cover + caption + QA
frames) -> publish pack -> metrics -> comparison -> report. Every step is a command in
`README.md`; nothing is published and nothing has been bought (EUR 0).

Deliverables of the "CREATIVE INTELLIGENCE UPGRADE" brief:

| Deliverable | Where | State |
|---|---|---|
| Architecture decision record | `docs/adr/0001`, `docs/adr/0002` | done |
| Working creative intelligence pipeline | `scripts/*.ts`, `src/` | done, verified below |
| Competitor/reference dataset schema | `data/references.csv`, `data/references.schema.json`, `scripts/add-reference.ts` | done (0 rows: manual, compliant import only) |
| Creative brief generator | `scripts/new-post.ts` + `content/archetypes.json` | done |
| Five reusable creative archetypes | `content/archetypes.json` | done |
| Three completed sample creatives | `out/pasta-class-palermo` (reel + 8 slides, EN), `out/chef-a-domicilio` (reel, IT), `out/eventi-finger-food` (8 slides, IT); plus variant B of EXP-001 | done, rendered and inspected |
| Analytics and experimentation schema | `data/experiments.csv` (4 rows, metrics empty), `data/experiments.schema.json`, `scripts/log-metrics.ts`, `compare.ts`, `report.ts` | done |
| Tests and verification report | `tests/*.test.ts` (39), `tools/py/test_*.py` (2), this file | done |
| Costed next-step roadmap | `docs/roadmap.md`, `docs/higgsfield.md` | done |
| Research with classified sources | `docs/research.md` | done; Help Center limits still unread |

Six capabilities: competitive intelligence (schema + manual import), knowledge base
(archetypes + performance report), planning (brief, storyboard), production (Remotion
templates, local camera moves, video scenes via FFmpeg), experimentation (variants,
experiment ids, hypotheses, gate, Wilson comparison), revenue intelligence (funnel
columns from reach to contribution margin, left empty until measured).

## Checks executed (2026-11-06)

| Check | Command | Result |
|---|---|---|
| Lint + types | `npm run lint` | 0 errors |
| Node unit tests | `npm test` | 39 passed, 0 failed |
| Python tests | `npm run test:py` | 2 passed |
| Data validation | `npm run validate:data` | 4 experiment rows valid, 0 references |
| Quality gate | `node scripts/gate.ts content/posts/*.json` | 4 PASS; warnings: silent reels (3), one 2.1x upscale |
| Full render | `node scripts/render.ts --all --qa` | 4 posts, no errors |
| ffprobe | reels | pasta-class A and B: h264 1080x1920 600 frames 20.0 s; chef-a-domicilio: 528 frames 17.6 s |
| Visual QA | 23 reel frames + 24 slides inspected | correct media, legible text in safe areas |
| Video scene path | temporary post with a real phone clip (480x848 -> 1080x1920 via FFmpeg), rendered at 0.5 scale, frames inspected, artifacts removed | works |
| Storyboards, publish packs, report | `storyboard.ts`, `publish-pack.ts`, `report.ts` on all posts | written to `out/<slug>/` and `docs/performance.md` |
| Security review follow-up | adapter URL confinement, media path traversal, CSV formula injection, fail-closed consent | fixed with tests |

## Open work (needs Gabriele or the chef)

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
