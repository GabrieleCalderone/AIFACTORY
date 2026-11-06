# Costed roadmap (nothing below is approved or purchased)

Rules: EUR 0 incremental until approval, EUR 20/month ceiling, no autopublishing, real
assets, no fabricated metrics. Costs are what the official pages state on 2026-11-06
(docs/research.md, docs/higgsfield.md); unknowns are marked.

| # | Step | What it needs | Monthly cost | Gate to start | Expected effect |
|---|------|---------------|--------------|---------------|-----------------|
| 0 | Publish the three samples manually, add audio in-app, log metrics after 7 days | 1 h/post of Gabriele's time | EUR 0 | chef approval of texts | first measured rows in `data/experiments.csv` |
| 1 | Run variant B of EXP-001 one week after A; compare with `node scripts/compare.ts` | nothing | EUR 0 | A measured | first hook-wording signal (expect "not distinguishable" at <1,000 plays) |
| 2 | Shoot 10 vertical clips (chef hands, flame, pasta lift, plating) and use `video` scenes | phone, 1 hour | EUR 0 | none | removes the upscaling warnings; Instagram penalises low-res |
| 3 | Buffer free plan for scheduling from `publish.json` | Buffer account, API key, an adapter (~1 day) | EUR 0 (free plan limits: 600 req/24 h) | explicit approval to connect the Instagram account | fewer manual steps; still human approval per post |
| 4 | Instagram Platform API for metrics import (reach, plays, saves) | Meta developer app, Business account, review for `instagram_business_basic` | EUR 0 | approval + Meta app review | metrics logged automatically instead of by hand |
| 5 | Higgsfield API image-to-video on 1-2 hero stills per post | API key, `/estimate` before each call, cap in `.env` | pay-per-request, price per video UNKNOWN until estimated; cap EUR 15 | EXP-001/002 show watch time is the bottleneck | real camera orbit/parallax on stills |
| 6 | Licensed music file library for `reel.audio` | a royalty-free subscription or per-track licences | typically EUR 10-20/month (vendor prices not verified here) | only if in-app audio proves limiting | consistent sound across exports |

Not planned: paid "AI virality scores", engagement pods, scraping of competitor
accounts, synthetic dishes or people.

Decision points for Gabriele: step 3 (connect Buffer), step 4 (Meta app), step 5 (first
generative spend). Each needs a yes in writing before any key is created.
