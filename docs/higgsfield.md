# Higgsfield: what was verified, what was built locally, what it would cost

Sources: official Higgsfield pages fetched on 2026-11-05 by the research agent of the
previous session (help center, API docs, camera-controls page, terms). Plan prices did
not render (JavaScript pricing page), so they are UNKNOWN here. Everything below is
labelled [VENDOR CLAIM], [INDEPENDENT] or [ASSUMPTION].

## Findings

- [VENDOR CLAIM] "Camera Controls" offers 50+ motion presets on image-to-video models,
  among them Dolly In / Super Dolly In, Dolly Out, Crash Zoom In / Out, Rapid Zoom,
  Arc Left / Right, 360 Orbit, Overhead, Crane Up / Down, Jib, Lazy Susan, Eating Zoom,
  Handheld, Focus Change, Whip Pan, Timelapse variants. (higgsfield.ai camera-controls page)
- [VENDOR CLAIM] Web plans: free use limited to a small set of models and no credits;
  individual plans monthly or annual with monthly credit allowances that expire at
  renewal; "Unlimited" models only on higgsfield.ai, never through MCP/CLI/API.
  (help center: "How do Higgsfield plans work", "How do credits work")
- [VENDOR CLAIM] API: key-based auth (`Authorization: Key id:secret`), pay per successful
  request from a prepaid balance that expires one year after top-up, an `/estimate`
  endpoint returns the USD cost before generating (the docs' example shows "0.094" USD
  for one Soul image), outputs are deleted after seven days, failed or moderated
  requests are not charged. (docs.higgsfield.ai billing-and-retention, llms.txt)
- [VENDOR CLAIM] Terms: the company does not claim ownership of your inputs or outputs
  (4.4) and clause 5(e) explicitly preserves commercial use of outputs; outputs may carry
  invisible C2PA-style provenance marks (6.4); you must hold likeness rights for any
  person in uploaded content (4.2). Prices for video generations were not visible.
- [INDEPENDENT] None found in the saved material for "cinematic logic" effects on
  retention; the agent that was to check peer-reviewed sources hit the session limit.
  Treat any uplift claim as [ASSUMPTION] until an experiment row in
  `data/experiments.csv` says otherwise.

## What was built instead (EUR 0)

`src/components/MotionImage.tsx` re-creates the moves that suit RistHome's material,
which is still photography of dishes and of the chef:

| Spec value       | Higgsfield preset it mimics | Local implementation                                   |
|------------------|-----------------------------|--------------------------------------------------------|
| `dolly-in`       | Dolly In / Super Dolly In   | slow push 1.00 to 1.24 with an ease that settles, slight upward drift |
| `crash-zoom-in`  | Crash Zoom In               | 1.00 to 1.34 in 0.35 s with a short motion blur, then a slow drift |
| `arc-left/right` | Arc Left / Arc Right        | perspective rotateY from -6 to 6 degrees with a push, fakes a parallax arc |
| `pan-left/right` | Pan Left / Pan Right        | lateral slide at 1.14 scale                            |
| `zoom-in/out`    | Zoom In / Zoom Out          | classic Ken Burns                                      |

Used in the three sample creatives (see the `motion` fields in `content/posts/*.json`)
and visible in `out/<slug>/qa/*.png`.

Limits: a 2D push cannot reveal new parallax, so a true orbit around a plate still needs
either a real video clip (the business has five phone clips at 480x848, too small) or an
image-to-video model.

## Costed roadmap (requires approval; nothing has been bought)

| Step | What | Cost | When it pays |
|------|------|------|--------------|
| 0 | Keep local presets, publish the three samples manually, measure | EUR 0 | now |
| 1 | Shoot 10 vertical phone clips (chef hands, pasta lift, flame) and add a `video` scene type | EUR 0 | first reel after the clips |
| 2 | Higgsfield API, image-to-video on 1-2 hero stills per post, `/estimate` before every call, hard stop at EUR 15/month | pay-per-request, per-video price unknown until estimated with a key | only if EXP-001 shows watch time is the bottleneck |
| 3 | Alternatives to price against before choosing 2: fal.ai, Replicate (pages saved in the previous session) | pay-per-request | same gate as 2 |

Rules that stay in force: never upload guests' faces, never pay for a subscription when
a pay-per-request estimate exists, keep the `estimate` figure in the experiment row.
