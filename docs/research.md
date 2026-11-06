# Research notes (verified 2026-11-06)

Every claim is tagged [OFFICIAL] (platform or vendor documentation fetched on the date),
[INDEPENDENT] (peer-reviewed) or [ASSUMPTION] (our inference). Figures from third-party
blogs were not used unless confirmed by an official page.

## Meta / Instagram ranking and originality

- [OFFICIAL] Reels ranking signals, in order: the viewer's activity (reels liked, saved,
  reshared, commented), history with the poster, information about the reel (audio
  track, visuals, popularity) and about the poster. Predictions used: reshare, watch the
  reel all the way through, like, open the audio page.
  https://about.instagram.com/blog/announcements/instagram-ranking-explained (dated 2023-05-31)
- [OFFICIAL] Instagram makes reels less visible when they are low-resolution,
  watermarked, muted, have borders, are mostly text, or were already posted on
  Instagram. Same URL.
- [OFFICIAL] Official reach tips: short reels (at most 3 minutes to be recommended),
  collaborations, keywords in captions and bio, Favorites, Insights (followers vs
  non-followers), Account Status, original content, no evident watermarks, no regular
  resharing of others' content. https://creators.instagram.com/blog/tips-for-improving-your-reach
- [OFFICIAL] Reel and carousel length limits on the Help Center could not be fetched
  (page returned empty to the fetcher). Third-party guides disagree (3 vs 20 minutes,
  10 vs 20 slides). The pipeline keeps reels under 90 s and carousels at 2-20 slides.
  [ASSUMPTION] until read on help.instagram.com from a browser.
- [OFFICIAL] Instagram Platform content publishing API: two-step container flow,
  `media_type=REELS` with a public `video_url`, permissions
  `instagram_business_content_publish` (Instagram Login) or `instagram_content_publish`
  (Facebook Login), reels cannot be carousel items, rate limit per account of 50 or 100
  API-published posts per 24 h depending on the doc version.
  https://developers.facebook.com/docs/instagram-platform/content-publishing
- [ASSUMPTION] Our brand overlay (small logo top-left) is not a "watermark" in the
  policy sense, which targets third-party app marks and reposts. Keep it small and
  test a no-logo variant if reach is low.

Consequences in this repo: quality gate warns on silent reels and on upscaling above 2x;
captions carry keywords (dish names, Palermo); every post is original material.

## TikTok Creative Center

- [OFFICIAL] Free, public, login not required: Top Ads library, Trends (hashtags,
  songs, creators, videos), Keyword Insights, Symphony AI tools.
  https://ads.tiktok.com/help/article/creative-center (updated July 2026)
- [ASSUMPTION] Useful for reference rows (`permission_basis=tiktok_creative_center`)
  on hook styles in food and travel; song clearance for business use must be checked
  per track inside the tool.

## Buffer publishing API

- [OFFICIAL] Public API at https://api.buffer.com, `Authorization: Bearer <key>`, keys
  from Settings > API, OAuth 2.0 PKCE also available. Free plan: 1 key, 150 requests
  per 15 min, 600 per 24 h, 1,000 per channel per 30 days. `createPost` supports
  `addToQueue` and `customScheduled` (`dueAt`), Instagram post types post/story/reel.
  https://developers.buffer.com/guides/authentication.html,
  https://developers.buffer.com/guides/api-limits.html,
  https://developers.buffer.com/guides/posts-and-scheduling.html
- [ASSUMPTION] A free Buffer account would be enough for RistHome's volume
  (a few posts per week), at EUR 0. Not connected: the brief requires approval first.
  `scripts/publish-pack.ts` produces the hand-off package a Buffer adapter would consume.

## Short-form video retention and hooks

- [INDEPENDENT] A 2026 review identifies six mechanisms through which short-form video
  builds brand engagement: rapid attention capture, entertainment-led processing,
  authenticity signalling, interactive participation, creator mediation and algorithmic
  circulation. Bikowski 2026, British Journal of Marketing Studies.
  https://consensus.app/papers/details/f5dbc476642b58239e5c1af1b1bda049/
- [INDEPENDENT] In 80 TikTok videos from four creators, curiosity and pain-point hooks
  earned higher engagement than direct informational openings, controlling for length,
  subtitles and face visibility. Small, single-niche sample. Phyoe 2026.
  https://consensus.app/papers/details/023b104bf640597d856952b5d0484392/
- [INDEPENDENT] Across TikTok ad data, performance expectancy, entertainment, tie
  strength and sales approach relate to engagement, moderated by product type.
  Xiao et al. 2023, Journal of Retailing and Consumer Services (185 citations).
  https://consensus.app/papers/details/9995aa34231c5fd29f379358a899ca1e/
- [ASSUMPTION] For RistHome, "curiosity" hooks translate to promises with a concrete
  payoff ("what you cook in our class") rather than clickbait; test as variant B/C.

## AI-generated creative and disclosure

- [INDEPENDENT] Ads labelled as human-made earned more trust and purchase intent than
  ads labelled as AI-made, especially for high-involvement products.
  Israfilzade 2025, Equilibrium. https://consensus.app/papers/details/579da6df87375e98acd58203dfcc0870/
- [INDEPENDENT] When told the source, consumers rated human-made images higher
  (d = 0.52); disclosing a "cost efficiency" motive lowered trust and intent.
  Zhang et al. 2025, Administrative Sciences. https://consensus.app/papers/details/6b2b036acbe6518287b6031bedff2fcb/
- [INDEPENDENT] One experiment found no significant effect of a "Created by AI" label,
  with over half of participants not noticing it (N = 179). Bettenworth 2026.
  https://consensus.app/papers/details/f52a988a73085ce988ab219675582212/
- [ASSUMPTION] For a chef whose product is a real person cooking real food, synthetic
  food or people imagery is a brand risk; generative tools stay limited to camera
  motion on real photos, disclosed where required (EU AI Act), never for dishes or
  faces that were not real.

## Remotion agent skills

- [OFFICIAL] Installed via `npx remotion skills add` (skills-lock.json); followed for
  compositions, transitions, local fonts, media components and rendering.

## Gaps

- Help Center limits (reel length, carousel slides) unread from an official page.
- No peer-reviewed evidence specific to Sicilian food or hospitality reels; the three
  experiment rows are the first local evidence.
