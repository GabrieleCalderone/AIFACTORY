# ADR 0005: Content Intelligence OS (selection, provenance, controlled publishing)

Status: accepted, 2026-11-07, on the "RISTHOME CONTENT INTELLIGENCE OS" specification.
Builds on ADR 0001-0004 without rewriting them.

## Decisions

1. **Visual Quality & Brand Fit Engine before any post.** Deterministic technical analysis
   (`tools/py/analyze_assets.py`: SHA-256, perceptual hash, exposure, sharpness, noise,
   contrast, text space, centre weight, near-duplicate groups) plus a vision-LLM catalogue
   (`scripts/describe-assets.ts`: people, subject, aesthetic, premium fit, fit per service,
   fit per format, issues). `src/lib/visual-score.ts` combines them as
   Q = 0.30 A + 0.25 R + 0.20 T + 0.15 C + 0.10 U with hard constraints (guests, printed
   logos, screenshots, human exclusion), tiers 85/70 and one reason list per verdict.
   Ranking diversifies by near-duplicate group. Human overrides live in
   `data/asset-overrides.json`. The author takes only usable/premium photos for the
   service and format at hand and stops with exit code 3 when fewer than six remain.
   Weights and thresholds are explicit constants to be recalibrated against human ratings.
2. **Editorial pipeline state machine** (`src/lib/pipeline.ts`, `data/pipeline.json`):
   DISCOVERED → QUALITY_CHECKED → (RENDERED → READY →) APPROVED → SCHEDULED → PUBLISHED →
   MEASURED, plus REJECTED, BLOCKED, FAILED. SCHEDULED needs Buffer post ids, PUBLISHED needs
   the platform's status or link, MEASURED needs a metrics timestamp. Produced content is
   never reported as published. Approval is manual in the console until `AUTOPUBLISH=true`.
3. **Unified media registry** (`data/media-registry.json`, `src/lib/registry.ts`): every
   file keyed by SHA-256 with sources (local original, pool copy, generated, render),
   consent, licence, synthetic flag and provenance. GitHub holds code and the small
   published media set; large originals stay in their folders; R2 is available as the
   persistent public store (`src/adapters/r2.ts`, Signature V4 verified against the AWS
   documented vector) when `MEDIA_STORE=r2`.
4. **Higgsfield, REAL-FIRST and budget-gated** (`src/adapters/higgsfield.ts`,
   `scripts/genai-studio.ts`): estimate first, monthly ledger against
   `GENAI_MONTHLY_CAP_EUR` (default 0, ceiling 20), submit/poll/cancel confined to the API
   origin, outputs downloaded with a provenance sidecar and marked synthetic in the registry.
   Synthetic media is for editorial use only; dishes, chef, locations and services are
   never faked.
5. **Product looks** (`src/brand/looks.ts`): colour grade, vignette, accent, chip tone and
   typographic register per service (class, chef, villa, events), applied by the templates
   from the post's archetype.
6. **Revenue view** (`content/products.json`, `scripts/report.ts`): products linked to
   landing anchors and booking channels; report shows inquiries, bookings, revenue,
   assumed margin, AI cost and cost per booking per product, blanks where unmeasured.
7. **Console** (`scripts/dashboard.ts` + `.html`): six sections (Overview, Media
   Intelligence, Creative Studio, Publishing, Performance, Settings) showing backend facts
   only; per-launch session token, local origin checks, escaped rendering, redacted job
   logs, `.env` allow-list with secrets never echoed back.

## Consequences

- With the current archive the engine rates few photos usable per service (for example 9
  for cooking-class reels). That is the honest finding: the next lever is better source
  material (a shoot, phone clips) or studio enhancement, not more posts.
- Daily production continues, but nothing reaches Buffer until a human approves or
  `AUTOPUBLISH=true` is set after an end-to-end validated publish.
- Thresholds, weights and the look parameters are configuration, not code paths; they
  should be revisited after the first measured month.
