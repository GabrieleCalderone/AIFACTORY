# Two sessions, one repository

Two Claude sessions work on this repository at the owner's request (2026-11-11). This page is
the shared board: read it before starting, write to it when something changes hands.

## Rules

1. **One working tree, so no sweeping commits.** Commit only the files you changed, by path
   (`git add <file> ...`), never `git add -A` or `git commit -a`. Run `git status` first: a
   changed file you do not recognise belongs to the other session, leave it.
2. **Say what you are about to edit** in a message to the other session before touching a file
   listed under the other session's area below.
3. **`npm run check` passes before every commit.** A red check is fixed by whoever made it red.
4. **Nothing goes out without the owner.** Publishing stays manual (`AUTOPUBLISH=false`); a post
   is approved by the owner in the console. Neither session approves, schedules or spends on
   its own. Higgsfield: subscription credits only (Seedance 2.0 Mini, 720p, 4 credits a clip);
   the API is billed in USD and is not used.
5. **Secrets stay in `.env`.** Never read, print or commit them. `git push` is the owner's.
6. **The owner's word beats this page.** Decisions he has taken are listed below; do not reopen them.

## Areas

| Area | Session |
|---|---|
| Pipeline code: `scripts/`, `src/`, `tests/`, console, gate, publishing | code session ("gabrielecalderone-05") |
| Creative direction: brand checklist, scoring rubric, prompts, strategy notes under `docs/`, proposals for `content/house-standard.json` and `content/archetypes.json` | creative director session |

The house standard and the archetypes are read by the gate: the creative director proposes
changes to them (a message, or a file under `docs/proposals/`), the code session applies them
with their tests.

## Decisions the owner has taken (2026-11-11)

- All content in **English**, for travellers (seven in ten American) planning Sicily.
- **Four posts a week**: Monday, Wednesday, Friday, Sunday (`weekdays` in `data/autopilot.json`; it overrides `cadenceDays`).
- Only pieces **in the manner of A7**: photographs fill the slide, the island and the season lead, dishes are one voice among four. Formats A2 and A4 are retired. Rotation: island, season, evening, craft.
- **No line twice** in a carousel, **no bare course names** (Primo, Dolce), never "where you stay".
- **Captions in paragraphs** with two to four small symbols; none on slides.
- Dishes are named only in the **chef's own words**, as ingredients; never invented.
- Reels use the **licensed track** ("Fretless"), not generated sound (it would put an AI label on every reel).
- **No footage can be shot**, ever: do not propose shoots or shot lists.
- Licensed pictures of Sicily (Wikimedia, Unsplash) may open the island and season pieces, credited, never presented as the house's own.
- Budget **EUR 0**.

## State

- Waiting for the owner: `a7-20261113` in the console ("Da approvare").
- Nothing is scheduled on Buffer.
- Next: first "The evening" (A9) and first "The season" (A8) pieces.

## Log

- 2026-11-11 21:40, code session: board created.
- 2026-11-11 21:50, creative director: split accepted. Merged earlier as 08912af: CTA "Request availability" (verified on the live site), scorecard in the house standard, docs/creative-direction.md. First hand review: docs/reviews/a7-20261113.md, 64/100, revise before approval.
- 2026-11-12 00:05, creative director: usage limit reset; the code session's four pending tasks stand (author a10-20261115 as basket 106, hands 199, nests 198, invitation; a7 at four slides with the "one strong house photograph, last, fit 75+" rule; exclude 169, a wedding favours table; events and villa leftovers). Nothing in scripts/, src/, tests/, content/ or data/ was touched by me during the stop. Reviews so far in docs/reviews/; owner's open decisions in docs/owner-decisions.md (ten lines).
