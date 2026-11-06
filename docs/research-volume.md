# State of the art: content farms, account matrices and "millions of views" (verified 2026-11-06)

Tags: [OFFICIAL] platform or vendor page, [PRESS] journalism citing data firms, [VENDOR] marketing
blogs of tool sellers, [INDEPENDENT] peer-reviewed, [ASSUMPTION] our inference.

## 1. What the Chinese farms actually do

- [PRESS] AI micro-dramas on Douyin are the first mass application of AI video: 120,000+ short
  dramas online in Q1 2026, 95% made with generative tools; production cost fell from about
  5,000 yuan per minute to a few hundred. Reuters via DataEye: 221,900 new AI shows in H1 2026,
  only 1,055 passed 100 million views (about 0.5%). Signs of overcapacity and squeezed margins.
  https://www.investing.com/news/economy-news/china-fuels-rush-to-turn-ai-video-into-an-industry-4916500
  https://thenextweb.com/news/china-micro-drama-ai-state-funding
- [VENDOR] "Matrix accounts" (矩阵号): one operator runs many accounts, batch-generates scripts
  and videos (a few yuan per clip), schedules with multi-account tools, mass-DMs. The same
  guides warn that Douyin's duplicate detection catches lightly edited batch videos and that
  "10 clearly different videos a day beat 50 similar ones"; persona (人设, the boss as the
  face) matters more than image quality.
  https://www.csdn.net/article/2026-08-13/163714822
  https://www.tixiaolu.com/posts/ai-short-video-matrix-2026/
- [ASSUMPTION] The transferable lessons are volume _with differentiation_, a recurring
  persona, systematic hook testing and distribution on every surface. The non-transferable
  parts are reposting others' content, bot engagement, fake accounts and faceless mass
  duplication, which the Western platforms sanction (next section).

## 2. What the platforms penalise (and why farm tactics backfire here)

- [OFFICIAL] Instagram makes reels less visible when they are low-resolution, watermarked,
  muted, mostly text or already posted on Instagram; accounts that regularly reshare others'
  content lose recommendations.
  https://about.instagram.com/blog/announcements/instagram-ranking-explained
  https://creators.instagram.com/blog/tips-for-improving-your-reach
- [PRESS] Meta removed 10M+ impersonating profiles and 500k spam accounts in H1 2025 and said
  it would act against networks of fake comments and fake pages built to inflate reach.
  https://www.graphic.com.gh/tech-news/meta-deletes-10-million-fake-profiles-tightens-content-rules.html
- [PRESS] TikTok prevented about six billion fake likes in Q3 2025; its Community Guidelines
  prohibit fake engagement and deceptive behaviour.
  https://statista.com/statistics/1318268
  https://conductatlas.com/platform/tiktok/tiktok-community-guidelines/fake-engagement-and-deceptive-behavior-prohibition/
- [ASSUMPTION] Buying views or running bot "matrices" would cost the RistHome account its
  reach and the business its reviews; it stays out of scope permanently.

## 3. What legitimately produces large, steady view counts

- [INDEPENDENT] Post frequency, video and interactivity significantly raise engagement in
  brand accounts (1,130 posts, four brands). Aydin et al. 2021.
  https://consensus.app/papers/details/c467835ad4c25cee9fab89ea36697aa8/
- [INDEPENDENT] Posting across platforms creates spillover and carry-over effects; a
  resource-allocation model across platforms beats a single-platform focus. Unnava et al. 2021.
  https://consensus.app/papers/details/8cec5b70f01a5aedae5d736160369be8/
- [INDEPENDENT] Engagement volume has diminishing returns on brand outcomes; variety of
  engagement sustains them. Schaefers et al. 2021.
  https://consensus.app/papers/details/de4db1a70ef95a37b0f398482a9241c3/
- [INDEPENDENT] Curiosity and pain-point hooks out-perform plain informational openings in
  short videos (small sample). Phyoe 2026.
  https://consensus.app/papers/details/023b104bf640597d856952b5d0484392/
- [OFFICIAL] Instagram case: pastry chef Cédric Grolet gets 81% of reel plays from
  non-followers.
  https://creators.instagram.com/blog/how-pastry-chef-cedric-grolets-creative-use-of-reels-helped-grow-his-instagram-audience
- [PRESS] Chef Ryan Peters passed 1M followers with an account almost entirely about
  preparing pasta (single-niche series). https://www.pittsburghmagazine.com/?p=101633
- [VENDOR, unverified] Instagram "Trial Reels" show a reel to non-followers first; Meta is
  quoted as reporting an 80% lift in non-follower reach and 40% of creators posting more.
  Not available through Buffer's API; it is an in-app toggle.
  https://techcrunch.com/2024/12/10/instagram-rolls-out-trial-reels-that-arent-shown-to-a-creators-followers
- [VENDOR] Repurposing guides agree on one rule: platform-specific edits, never the same
  copy everywhere.
  https://dev.to/bulkdl/how-to-repurpose-one-video-into-10-social-media-posts-the-complete-workflow-2026-16l8

## 4. What this repo now does with it (ADR 0004)

| Farm lesson                          | RistHome implementation                                                                                                                                  | Where                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Volume with differentiation          | one post per day, photos never reused within the last 8 posts, 102-photo consent-filtered pool, vision review of every text                              | `src/lib/autopilot.ts`, `scripts/author.ts` |
| Persona and series                   | archetype A6 "Dalla cucina di Giacomo / From Giacomo's kitchen", numbered episodes, chef in every hook                                                   | `content/archetypes.json`                   |
| Every surface                        | each reel goes to Instagram, TikTok, YouTube Shorts and Facebook (staggered by an hour), carousels to Instagram and Facebook; platform-specific captions | `src/lib/channels.ts`, `scripts/publish.ts` |
| Hook testing                         | variant B authored automatically once A is measured; Wilson comparison                                                                                   | `scripts/variant.ts`, `scripts/compare.ts`  |
| Originality, no watermarks, audio on | pool excludes printed logos; CC BY track attached with credit; gate blocks foreign URLs and leaked data                                                  | gate, `content/audio.json`                  |

Expectation setting [ASSUMPTION]: the Douyin data shows a 0.5% chance of a 100M-view hit even
at industrial scale. For a two-person Palermo business the realistic engine is 30 posts a
month on four surfaces, measured, with the series and the hooks that measure best getting
more episodes. "Millions of views" is a cumulative, multi-platform, multi-month outcome, not
a per-post promise.
