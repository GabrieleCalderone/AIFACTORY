# ADR 0003: full automation without approval steps

Status: accepted, 2026-11-06, on Gabriele's instruction "deve essere tutto automatizzato,
io non devo approvare niente". Supersedes the approval checklist in `publish-pack.ts`
(kept as a hand-off artefact) and the "approval" wording in docs/roadmap.md step 0.

## Decisions

1. **Headless Claude Code as the author and reviewer** (`claude -p`, subscription, no API
   key): photo cataloguing with consent classification, brief and text generation from
   photo descriptions, and a second vision pass that compares every text with its photo.
   Cost is covered by the existing subscription; the model is `sonnet` by default.
2. **Consent and resolution are decided by data, not by a person**: the catalogue's
   `people` field feeds the gate; `guests` never reach the pool; photos too small for the
   slot are not even offered to the author.
3. **Buffer as the publisher** (free plan, personal API key): it owns the Instagram OAuth,
   schedules reels and carousels from public URLs and returns post metrics, which closes
   the measurement loop without a Meta developer app. Meta's own API remains the fallback
   documented in docs/research.md.
4. **GitHub Pages as the media host**: free, already authenticated (`gh`), versioned by
   spec hash. Public by nature; only media that is about to be published goes there.
5. **launchd on the Mac** as the scheduler: no cloud cost, logs on disk, one command to
   install or remove.
6. **Dry run is the default** when keys are missing: the loop never silently stops; it
   produces drafts and prints the payloads it would have sent.

## Consequences

- Two human actions remain, both account-level and one-time: connecting Instagram inside
  Buffer (needs the Instagram login) and running the media-host and scheduler installers
  (the automated session was not allowed to create persistence or public repos).
- Text style is deliberately literal (what the photo shows) because fidelity outranks
  copywriting flair; archetype prompts can be tuned in `content/archetypes.json` and
  `content/brand-facts.json` without code changes.
- Buffer's `metadata.instagram` input shape is taken from the public guides and not yet
  exercised against the live schema; the first real publish will confirm it.
