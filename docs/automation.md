# Automation: the self-running loop (Content Intelligence OS edition)

Daily, on the Mac, the agent `it.risthome.autopilot` (10:30) runs `scripts/autopilot.ts`.
Humans intervene in the console for approvals (until `AUTOPUBLISH=true`), overrides on
photos, and credentials. Spend stays at EUR 0 unless a generative budget is set.

## The cycle

1. `sync-metrics`: Buffer post metrics for publications older than 24 h; experiments go to
   `measured`, the pipeline record to PUBLISHED/MEASURED with evidence.
2. `validate:data` (fatal on errors) + `report` (`docs/performance.md`, including the
   revenue view per product).
3. If a post is due (calendar day; `cadenceDays` in `data/autopilot.json`):
   - **plan**: rotation A6, A1, A3, A2, A4, A6, A5; language alternates; variant B of an
     experiment once A is measured.
   - **select** (`scripts/author.ts` → `src/lib/visual-score.ts`): only photos rated
     usable or premium for the archetype's service and format, one per near-duplicate
     group, not used in the last eight posts; fewer than six → exit 3 "insufficient media".
   - **author**: headless Claude writes brief and texts from the photo descriptions and
     brand facts; a second vision pass rewrites anything not visible; audio with credit.
   - **gate** → pipeline DISCOVERED → QUALITY_CHECKED (REJECTED on errors).
   - **render** (reel, cover, slides, QA frames, storyboard) → RENDERED, with the product
     look (`src/brand/looks.ts`).
   - **host** media (GitHub Pages or R2) → READY.
   - **publish**: only if APPROVED (console) or `AUTOPUBLISH=true`; otherwise the post waits
     in READY. Scheduled posts → SCHEDULED with Buffer ids; drafts with `--draft`.
4. `STOP` file pauses everything; `logs/autopilot-<date>.log` and `logs/autopilot.jsonl`
   keep the trail; secrets are redacted in the console.

## The console (`npm run dashboard`)

- **Overview**: KPIs (usable assets, posts awaiting approval, scheduled/published,
  measured experiments, AI spend), operational state, pipeline counts, issues, jobs.
- **Media Intelligence**: every pool photo with Q, tier, the five sub-scores, reasons,
  usage; filters by service, format, tier; Include/Exclude overrides; rescore; rebuild pool.
- **Creative Studio**: Higgsfield estimate and generation (needs keys and a budget);
  storyboards of recent posts.
- **Publishing**: queue with state history; Approva / Rifiuta / Programma su Buffer /
  Bozza su Buffer / Ri-renderizza; large previews with captions.
- **Performance**: experiments with measured columns only; costs.
- **Settings**: Buffer key, verify, detect channels; AUTOPUBLISH toggle; Higgsfield keys
  and monthly cap; infrastructure status; tests; registry sync.

## Media pipeline (Visual Quality & Brand Fit Engine)

```bash
npm run describe-assets -- --src "/folder"   # vision catalogue: people, subject, aesthetic, premium, service/format fit, issues
npm run build-pool                            # consent-filtered pool (guests and poor never copied; stale rows deleted)
npm run score-assets                          # technical analysis + Q per service/format -> data/asset-scores.json, manifest tiers
npm run registry-sync                         # data/media-registry.json (sha256, sources, consent, licence, provenance)
```

Q = 0.30 aesthetic + 0.25 relevance + 0.20 technical + 0.15 composition + 0.10 originality.
Blocked regardless of Q: guests, printed logos, screenshots/collages, poor quality, human
exclusion. Thresholds: premium ≥ 85, usable ≥ 70 (to recalibrate with human ratings).

## Generative studio (REAL-FIRST)

```bash
npm run studio -- --model higgsfield-ai/soul/v2/standard --prompt "..." [--image-url https://...]        # estimate only
npm run studio -- --model ... --prompt "..." --run                                                       # generate within GENAI_MONTHLY_CAP_EUR
```

Outputs land in `public/assets/generated/` with a `.provenance.json` sidecar and are
flagged synthetic in the registry. They are never presented as real photos of dishes,
chef or locations.

## One-time setup

1. `bash scripts/setup.sh` (done 2026-11-06: GitHub repo, Pages media host, launchd agent).
2. Buffer: connect channels, create an API key, paste it in Settings, verify, detect
   channels. Optional: Higgsfield keys and a monthly cap; R2 credentials with
   `MEDIA_STORE=r2`.
3. After the first end-to-end validated publish, switch on AUTOPUBLISH in Settings.
