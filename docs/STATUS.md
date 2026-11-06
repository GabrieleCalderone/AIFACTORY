# Status and verification report, 2026-11-07 (Content Intelligence OS)

## Phase status against the specification

| Phase                  | Delivered                                                                                                                                                                                                                                                                                                                    | Verified how                                                                                                              | Open                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0 Audit                | `.env not found` traced to the first `setup.sh` run before `.env` existed (fixed; all runners use `--env-file-if-exists`); "Autopilota attivo" meant "not paused" and is now shown next to the pipeline states; publishing impossible without channels is enforced in code                                                   | grep of runners, console status                                                                                           | –                                                                                       |
| 1 Visual Intelligence  | deterministic analysis (hashes, exposure, sharpness, noise, composition, near-duplicates), vision catalogue (people, subject, aesthetic, premium, service/format fit, issues), Q scoring with weights 0.30/0.25/0.20/0.15/0.10, hard constraints, tiers 85/70, reasons, diversification, overrides, Media Intelligence panel | 5 unit tests; 103 pool photos scored (class/reel: 0 premium, 9 usable, 77 excluded, 17 blocked); top candidates inspected | thresholds to calibrate with human ratings; catalogue of the two iCloud folders running |
| 2 Media Registry       | registry keyed by SHA-256 with sources, consent, licence, synthetic flag, provenance; connectors: local folders, pool, generated, renders; R2 store adapter                                                                                                                                                                  | registry-sync: 115 assets, 18 near-duplicate groups; SigV4 verified against the AWS documented vector                     | Google Drive = synced folder (no API connector); GitHub Pages remains the default host  |
| 3 Higgsfield Studio    | client (estimate, submit, status, cancel, waitFor, origin-confined links), monthly ledger and cap, provenance sidecars, concurrency lock, console studio                                                                                                                                                                     | 5 unit tests; dry run without keys                                                                                        | real call needs keys and a budget > 0                                                   |
| 4 Luxury production    | product looks (grade, vignette, accent, chip tone, typography) per service; review pass; premium ranking feeding selection                                                                                                                                                                                                   | re-rendered chef reel and events carousel, frames inspected                                                               | more premium source material needed (shoot)                                             |
| 5 Buffer publishing    | auth verify, discovery, channel map, 429 retry, drafts, duplicate protection, state machine with evidence, manual approval until AUTOPUBLISH, kill switch                                                                                                                                                                    | 4 unit tests; console approve/reject verified; dry-run publish shows 6 jobs per post                                      | real scheduling needs the Buffer key                                                    |
| 6 Revenue intelligence | products taxonomy, UTM, revenue view per product in the report (blanks where unmeasured), AI cost ledger                                                                                                                                                                                                                     | report regenerated                                                                                                        | metrics after the first publication                                                     |
| 7 Dashboard            | six sections, large previews, media ranking grid, approvals, studio, settings; token + origin checks, escaped output, redacted logs                                                                                                                                                                                          | curl checks: health, status, media, env masked, approve/reject, pool images                                               | –                                                                                       |

## Acceptance criteria

| Criterion                                                           | State                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Import and deduplicate the existing archive                         | done (registry 115 assets; 18 in near-duplicate groups; pool rebuild deletes stale files) |
| Motivated ranking of the best images                                | done (Q, parts, reasons per photo; Media Intelligence panel)                              |
| Exclusion of unfit assets                                           | done (17 blocked for guests/logos/quality; excluded tier below 70)                        |
| AI generation with prior cost confirmation                          | done in code (estimate → cap check → confirm in console); not exercised live (no key)     |
| Verified render of at least one premium content                     | done (reels and carousels re-rendered with looks and inspected)                           |
| Save a Buffer draft with a valid connection                         | code and tests done; needs the key                                                        |
| Real confirmation of scheduling and publishing                      | pipeline requires Buffer ids / platform status; needs the key                             |
| Metrics distinguishable between available, missing and experimental | done (blanks, status column, Wilson intervals)                                            |
| Immediate autopilot stop                                            | done (STOP file, console button)                                                          |

## Checks executed (2026-11-07)

- `npm run check`: lint and types clean, 69 Node tests, 2 Python tests, data valid.
- Scoring run on 103 photos; registry sync; studio dry run; console endpoint smoke test;
  two posts re-rendered with product looks.

## Credentials still needed (from Gabriele)

- Buffer API key (Settings in the console) and connected channels.
- Optional: Higgsfield key id/secret plus a monthly cap; R2 credentials if GitHub Pages is
  replaced as the media host.

## Residual limits

- The current archive yields few premium-grade photos; the engine says so instead of
  publishing mediocre material. A short photo/video shoot is the highest-leverage action.
- Buffer metadata shapes for TikTok/YouTube/Facebook and the `saveToDraft` field come from
  public guides and are confirmed on the first real call (errors are printed verbatim).
- Pushes, public repo creation and launchd installation are performed by Gabriele
  (policy); the console and scripts run locally.
