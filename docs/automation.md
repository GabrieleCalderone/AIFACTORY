# Automation: the self-running loop

Gabriele's instruction of 2026-11-06: everything automated, no approval steps. The loop below
runs daily on the Mac and needs a human only for two one-time account actions that no
script can perform (an Instagram login inside Buffer, and creating the public media repo).

## The cycle (`npm run autopilot`)

1. `sync-metrics`: pull Buffer post metrics for publications older than 24 h into
   `data/experiments.csv` (status `measured`, post URL filled in).
2. `validate:data` + `report`: rebuild `docs/performance.md`.
3. If a post is due (every `cadenceDays`, default 1 = daily; `--force` to post now):
   - **plan** (`src/lib/autopilot.ts`): rotate archetypes A6 (chef series), A1, A3, A2, A4,
     A6, A5 and languages en/it; if variant A of this archetype's experiment is measured and
     no B exists, author variant B, otherwise start a new experiment id.
   - **author** (`scripts/author.ts`): choose photos from the consent-filtered pool
     (`public/assets/pool`, built by `describe-assets` + `build-pool`: Claude catalogued
     117 photos, guests excluded, printed logos excluded, resolution checked), ask headless
     Claude Code for the brief and every text from the photo descriptions, validate with
     the schema, then a second Claude pass reads each photo next to its text and rewrites
     anything not visible (dish names, fillings, "fried" on raw food). Audio track and
     licence credit are attached automatically. Quality gate must pass.
   - **render** reel + carousel + cover + QA frames; **storyboard**.
   - **host** media on GitHub Pages (`scripts/host-media.ts`), wait until public.
   - **publish** through Buffer (`scripts/publish.ts`): the reel at the next 18:00 local slot
     on Instagram, then TikTok (+1 h), YouTube Shorts (+2 h), Facebook (+3 h); the carousel
     two days later on Instagram and Facebook; captions adapted per platform (ADR 0004).
     `data/publications.json` keeps every Buffer post id per platform.
   - advance state (`data/autopilot.json`), log to `logs/`.
4. Without `BUFFER_API_KEY`/`BUFFER_CHANNELS` the cycle still authors and renders, and
   prints the exact payload it would send (dry run), so drafts keep accumulating.
5. A file named `STOP` in the project folder pauses authoring and publishing; delete it to
   resume. No photo is reused within the last eight posts; when fewer than six fresh photos
   fit an archetype the author stops and asks for new photos or clips.

Verified on 2026-11-06: a forced dry-run cycle authored, reviewed, rendered and prepared
`a1-20261106` (reel 20 s + 7 slides, EN) in 88 s; the review corrected a slide that called
raw rice balls "fried".

## One-time setup (the only human actions)

1. **Buffer**: create an account at buffer.com, connect the RistHome Instagram professional
   account, TikTok, Facebook Page and YouTube channel (free plan = 3 channels; the fourth
   needs Essentials), then Settings > API > Create key. Put the key in `.env` as
   `BUFFER_API_KEY`, run `npm run buffer:channels` and fill `BUFFER_CHANNELS` with
   `instagram:ID,tiktok:ID,facebook:ID,youtube:ID` (any subset works). The first real
   `createPost` on each platform will reveal whether Buffer's metadata shapes match; errors
   are printed verbatim and the other platforms still go out.
2. **Media host**: `bash scripts/setup-media-host.sh` creates the public GitHub Pages repo
   `risthome-media` and enables Pages (gh is already logged in). Everything pushed there is
   public, which is what Buffer needs to fetch the files.
3. **Scheduler**: `bash scripts/install-autopilot.sh --hour 10 --minute 30` installs the
   launchd agent `it.risthome.autopilot` (daily 10:30, logs in `logs/launchd.log`).
   `--uninstall` removes it. The Mac must be awake at that time; otherwise launchd runs
   it at the next wake.

## Safety rails that stay on without approvals

- Only photos catalogued `none` or `chef` and without printed logos reach a post; missing
  consent data is a hard error.
- Texts may only use `content/brand-facts.json` plus what the photo shows; the review pass
  rewrites invented claims; prices never appear.
- Schema limits (lengths, 90 s, 2-20 slides), upscaling > 2x warnings, silent-reel warning
  (audio is attached automatically now).
- Buffer posts are scheduled, not instant: a wrong post can be deleted in Buffer before
  18:00 the same day.
- Spend: EUR 0. Headless Claude uses the Claude Code subscription; no API keys are set.

## Operating

```bash
npm run autopilot -- --dry-run --force   # full cycle without publishing
npm run autopilot -- --force             # publish now (needs .env keys)
tail -f logs/autopilot-$(date +%F).log
npm run report && open docs/performance.md
```
