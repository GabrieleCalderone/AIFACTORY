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

## Rules the two sessions agreed (2026-11-11 and 12)

These are working rules, not the owner's decisions: he may overturn any of them.

- **One invitation, in the site's words**: "Request availability on risthome.it (link in bio)". The site has no booking, only `/request-availability` (verified 2026-11-11).
- **Editorial scorecard**: seven criteria out of 100, threshold 85, four hard gates (`content/house-standard.json`, `src/lib/scorecard.ts`). A piece is read three times by the model and the middle reading kept; the creative director also scores by hand in `docs/reviews/`. The owner may approve below 85; automatic publishing may not.
- **Opening and closing**: a photograph of the house with `premium_fit` below 60 is never the cover or the last photograph. A piece that opens on licensed pictures may close on a single photograph of the house only when its fit is 75 or more.
- **Rest**: a photograph of the house 10 days and 3 published pieces; a licensed picture 28 days and 12 pieces. A cover as a cover again after 28 days and 12 pieces, and a cover line never twice: agreed, not yet in code.
- **Empty days**: when no piece can be built without breaking the rest, the slot stays empty and the console says why.
- **Guests**: a photograph with guests needs a dated written yes in `data/consents.json` (kept out of git).
- **Facts**: content says only what `content/brand-facts.json` holds. The site claims more (award-winning, market tour, yacht classes, van transfer); none of it is used until the owner confirms it.
- **Retired**: events, catering and the villa line are gone from content and code.

## State (2026-11-12, 00:30)

- **Waiting for the owner in the console ("Da approvare")**, none scheduled, nothing on Buffer:

  | Piece | Proposed day, 18:00 | By hand | Model |
  |---|---|---|---|
  | `a7-20261113` Sicily, in November (chef) | Friday 13 November | 71 | 55 |
  | `a10-20261115` Stay to cook (class) | Sunday 15 November | 75 | 63 |
  | `a9-20261114` Make it personal (chef) | Monday 16 November | 69 | 59 |

- **The archive is the limit**: seven photographs of the house may open or close a piece (chef 121, 164, 126, 143; class 106, 198, 199 in the middle only). Week one uses all of them. Under the rest rule no photograph is free before Monday 23 November; after that, about two pieces a week.
- **For the owner to read**: `docs/week-1.md` (the three pieces), `docs/owner-decisions.md` (twelve decisions), `docs/for-the-chef.md` (dish names, the Gambero Rosso wording, November ingredients), `docs/proposals/site-copy.md`, `docs/proposals/guest-photos.md`.
- **Open in code** (code session): the role of a photograph in the usage record, then the cover rules; the next buildable date and the standing notice for empty slots; the store of approved guest sentences and the A5 format, once the owner has chosen his sentences.
- **Open in direction** (creative director): nothing; reviews each new render from `out/`.
- **Not known**: Instagram Insights (no piece of the new line has been published or measured); an official brand book (the tokens in `src/brand/theme.ts` were sampled from the logo).

## Log

- 2026-11-11 21:40, code session: board created.
- 2026-11-11 21:50, creative director: split accepted. Merged earlier as 08912af: CTA "Request availability" (verified on the live site), scorecard in the house standard, docs/creative-direction.md. First hand review: docs/reviews/a7-20261113.md, 64/100, revise before approval.
- 2026-11-12 00:05, creative director: usage limit reset; the code session's four pending tasks stand (author a10-20261115 as basket 106, hands 199, nests 198, invitation; a7 at four slides with the "one strong house photograph, last, fit 75+" rule; exclude 169, a wedding favours table; events and villa leftovers). Nothing in scripts/, src/, tests/, content/ or data/ was touched by me during the stop. Reviews so far in docs/reviews/; owner's open decisions in docs/owner-decisions.md (ten lines).
- 2026-11-12 00:30, creative director: "Rules" and "State" brought up to date; plan for week two in docs/week-2.md, its rest figures implemented by the code session in d0ca9d6.
