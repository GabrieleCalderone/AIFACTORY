#!/usr/bin/env bash
# Everything that needs the human's GitHub/launchd permissions, in one run. Safe to re-run.
#   bash scripts/setup.sh            # connect repo, enable Pages media host, install the daily agent
# Afterwards: fill BUFFER_API_KEY and BUFFER_CHANNELS in .env (see docs/automation.md).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${GITHUB_REPO:-GabrieleCalderone/AIFACTORY}"
OWNER_LC="$(echo "$REPO" | cut -d/ -f1 | tr 'A-Z' 'a-z')"
NAME="$(echo "$REPO" | cut -d/ -f2)"

echo "== 1/4 git remote and push ($REPO)"
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin "https://github.com/$REPO.git"; fi
git push -u origin main

echo "== 2/4 GitHub Pages on $REPO (media served from /media)"
touch .nojekyll
gh api -X POST "repos/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true
echo "pages: $(gh api "repos/$REPO/pages" --jq '.html_url + " (" + .status + ")"' 2>/dev/null || echo 'not enabled yet')"

echo "== 3/4 .env defaults for the media host (no secrets)"
[ -f .env ] || cp .env.example .env
grep -q '^MEDIA_REPO_DIR=.' .env || sed -i '' "s|^MEDIA_REPO_DIR=.*|MEDIA_REPO_DIR=$(pwd)|" .env
grep -q '^MEDIA_BASE_URL=.' .env || sed -i '' "s|^MEDIA_BASE_URL=.*|MEDIA_BASE_URL=https://$OWNER_LC.github.io/$NAME/media|" .env
grep -q '^MEDIA_SUBDIR=' .env || echo "MEDIA_SUBDIR=media" >> .env
mkdir -p media && touch media/.gitkeep
git add .nojekyll media/.gitkeep && git commit -qm "chore: media folder for GitHub Pages" || true
git push -q

echo "== 4/4 daily launchd agent"
bash scripts/install-autopilot.sh --hour 10 --minute 30

echo
echo "Done. Remaining: BUFFER_API_KEY and BUFFER_CHANNELS in .env (npm run buffer:channels), then: npm run autopilot -- --force"
