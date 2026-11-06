# ADR 0002: data layer, quality gate, storyboards, variants, video scenes, adapters

Status: accepted, 2026-11-06. Extends ADR 0001.

## Decisions

1. **CSV + Zod for experiments and references.** Flat files stay readable by a human
   and by ChatGPT; Zod schemas (`src/schemas/experiment.ts`, `reference.ts`) parse
   numbers and turn empty cells into `null`. The JSON schema files are documentation
   and a test keeps their columns identical to the Zod shapes.
2. **Scripts, not a database.** `add-reference`, `log-metrics`, `compare`, `report`,
   `validate-data` cover the six capabilities with zero infrastructure. The report
   (`docs/performance.md`) is regenerated, never edited by hand.
3. **Pure quality gate** (`src/lib/gate.ts`) with injected IO: TODO texts, missing
   media, archetype, reel length, upscaling > 2x, consent per asset (`people` in the
   asset manifest), experiment row, silent reel. The render CLI refuses to render on
   errors; `--strict` promotes warnings.
4. **Consent is data and the gate fails closed.** `prepare_assets.py --people
   none|chef|guests-consented` writes the flag into the manifest (merged by file name,
   never overwritten); a missing manifest entry or an unrecorded `people` value is an
   error, not a warning.
10. **Hardening after the automated security review** (2026-11-06): media paths are
   validated against `../` and resolved inside `public/`; the gen-AI adapter validates
   every model-id segment and asserts the URL stays under `/estimate/`; the CSV writer
   defuses spreadsheet formulas (`=`, `+`, `@`, non-numeric `-`).
5. **Storyboard before pixels.** `scripts/storyboard.ts` renders the brief and beats to
   HTML/MD for approval; it reads the same spec the renderer uses, so there is no drift.
6. **Variants are files.** `scripts/variant.ts` clones a spec, changes named fields and
   adds the experiment row; the hypothesis stays attached.
7. **Video scenes** use `@remotion/media` `<Video>` (looped, muted) and an FFmpeg
   normaliser (`tools/py/prepare_clips.py`) so phone clips become 1080x1920 H.264.
8. **Generative adapters estimate only.** `src/adapters/genai.ts` has no `generate`
   method by design; `budgetPolicy` refuses caps above EUR 20 and defaults to EUR 0.
9. **Publishing is a hand-off.** `scripts/publish-pack.ts` writes everything a human or
   a future Buffer adapter needs; no network call exists in the repo.

## Consequences

- One `npm run check` covers lint, types, 36 Node tests, 2 Python tests and data validation.
- Adding a platform adapter later means consuming `publish.json`, not touching templates.
- The Python statistics helper was removed in favour of `src/lib/stats.ts` (one implementation).
