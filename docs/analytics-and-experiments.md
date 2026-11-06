# Analytics and experimentation

## Objects

- **Experiment** (`EXP-001`...): one hypothesis, one success metric decided before
  publishing. Variants (`A`, `B`...) differ in one thing (hook, archetype, length).
- **Variant row** in `data/experiments.csv`: identity, hypothesis, status, then metrics.
  Schema: `data/experiments.schema.json`. Empty cell = not measured. Never estimate.
- **Reference row** in `data/references.csv`: a permitted public reference, recorded by
  hand. Schema: `data/references.schema.json`.

## Where each number comes from

| Column | Source | How |
|--------|--------|-----|
| reach, plays, avg_watch_time_sec, likes, comments, saves, shares, profile_visits, link_clicks | Instagram Insights of the post, 7 days after publishing | type the figures by hand or paste the CSV export |
| link_clicks (cross-check) | GA4 on risthome.it | sessions with `utm_source=instagram&utm_content=<slug>`; add the UTM to the bio link when the post goes live |
| inquiries, qualified_inquiries | WhatsApp +39 340 593 1344 and the site form | count messages that mention the post or arrive within 72 h; qualified = date, guests, place |
| bookings, revenue_eur | `~/LAVORO/RISTHOME/RistHome_CRM_2026.xlsx` | attribute when the guest says where they saw RistHome |
| contribution_margin_eur | revenue minus direct costs | 60% of revenue is the working assumption until the cash book says otherwise |

## Reading results with small samples

Run `npm run compare -- EXP-001 --metric saves --base reach`. It prints a 95% Wilson
interval per variant and refuses to name a winner when intervals overlap. With a few
hundred plays per post that is the normal outcome; keep publishing variants and compare
across weeks, not single posts. `npm run report` rebuilds `docs/performance.md` (funnel
per variant, pooled rates per archetype).

## Entering data

- Metrics: `npm run log-metrics -- EXP-001 A --published-at ... --post-url ... --reach N --plays N --avg-watch-time-sec S --saves N --shares N --profile-visits N --link-clicks N --inquiries N --qualified-inquiries N --bookings N --revenue-eur X`
- References (compliant, manual): `npm run add-reference -- --url ... --platform instagram --format reel --hook-type promise --narrative process --pattern "..."`; only figures visible on the post, never scraped.
- Validation runs in `npm run check` (`npm run validate:data`).

## Quality gates before `status=approved`

1. Texts describe what the photos show; no unconfirmed prices or promises.
2. No guest faces without written consent; chef and food only by default.
3. Headline at least 84 px and support text at least 44 px on the 1080 px canvas, inside
   the Instagram safe area (checked on `out/<slug>/qa/*.png`).
4. Reel at most 90 s (the timeline math enforces it), carousel 2 to 20 slides.
5. The experiment row exists with hypothesis and success metric.
6. Pre-publication "AI scores" of virality are not used as evidence.
7. `npm run gate -- <spec> --strict` passes, or every warning is understood (silent reel, upscaling, consent).
