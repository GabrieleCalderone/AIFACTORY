# ADR 0004: daily cadence, chef series, four-platform distribution

Status: accepted, 2026-11-06, after the state-of-the-art review in docs/research-volume.md
and Gabriele's request to adopt what makes the Chinese farms work.

## Decisions

1. **Cadence 1 post/day** (`cadenceDays: 1`) rotating A6, A1, A3, A2, A4, A6, A5 and
   alternating EN/IT; the Mac renders about 30 posts a month at EUR 0.
2. **Differentiation over duplication**: the author refuses to offer a photo used in any of
   the last eight posts and aborts when fewer than six fresh photos fit the archetype, so
   the operator is told to shoot more instead of the system repeating itself.
3. **Series archetype A6** with a fixed opener and episode counter, the chef or his hands
   in every hook: the persona strategy the Douyin guides and the chef cases agree on.
4. **One render, four surfaces**: Buffer channels for Instagram, TikTok, YouTube Shorts and
   Facebook from `BUFFER_CHANNELS`; staggered schedule; captions shortened for TikTok and
   Shorts, untagged for Facebook. Carousels go to Instagram and Facebook two days later.
   Instagram remains the experiment's primary metric source; other platforms' metrics are
   kept per publication in `data/publications.json`.
5. **Nothing inauthentic**: no bought views, no bots, no reposts, no fake accounts. The
   gate, the pool and the catalogue enforce the originality rules mechanically.

## Consequences

- Buffer's free plan allows 3 channels; four surfaces need the Essentials plan (price to
  be checked on buffer.com; the roadmap cap of EUR 20/month applies) or dropping one platform.
- Buffer metadata shapes for TikTok, YouTube and Facebook are unverified; the first
  scheduled job on each platform will confirm them (errors are printed and the other
  platforms still go out).
- Trial Reels cannot be automated through Buffer; if wanted, it is a manual toggle per
  reel in the Instagram app.
