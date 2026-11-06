#!/usr/bin/env bash
# Everything that needs the human's GitHub/launchd permissions, in one run. Safe to re-run.
#   bash scripts/setup.sh
# 1) push this code repo, 2) create the SEPARATE public media repo (GitHub Pages),
# 3) write the non-secret media settings to .env, 4) install the daily launchd agent.
# Afterwards: fill BUFFER_API_KEY and BUFFER_CHANNELS in .env (see docs/automation.md).
set -euo pipefail
cd "$(dirname "$0")/.."
CODE_REPO="${GITHUB_REPO:-GabrieleCalderone/AIFACTORY}"
MEDIA_REPO="${MEDIA_REPO:-GabrieleCalderone/risthome-media}"
MEDIA_DIR="${MEDIA_REPO_DIR:-$HOME/Projects/risthome-media}"
OWNER_LC="$(echo "$MEDIA_REPO" | cut -d/ -f1 | tr 'A-Z' 'a-z')"
MEDIA_NAME="$(echo "$MEDIA_REPO" | cut -d/ -f2)"

echo "== 1/4 code repo: push to $CODE_REPO (visibility: $(gh repo view "$CODE_REPO" --json visibility --jq .visibility))"
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin "https://github.com/$CODE_REPO.git"; fi
git push -u origin main

echo "== 2/4 media host: separate public repo $MEDIA_REPO (GitHub Pages serves ONLY that repo)"
bash scripts/setup-media-host.sh "$MEDIA_REPO" "$MEDIA_DIR"

echo "== 3/4 .env media settings (no secrets)"
[ -f .env ] || cp .env.example .env
sed -i '' "s|^MEDIA_REPO_DIR=.*|MEDIA_REPO_DIR=$MEDIA_DIR|" .env
sed -i '' "s|^MEDIA_BASE_URL=.*|MEDIA_BASE_URL=https://$OWNER_LC.github.io/$MEDIA_NAME|" .env
sed -i '' "s|^MEDIA_SUBDIR=.*|MEDIA_SUBDIR=|" .env
echo "MEDIA_REPO_DIR=$MEDIA_DIR  MEDIA_BASE_URL=https://$OWNER_LC.github.io/$MEDIA_NAME"

echo "== 4/4 daily launchd agent"
bash scripts/install-autopilot.sh --hour 10 --minute 30

echo
echo "Done. Remaining: BUFFER_API_KEY and BUFFER_CHANNELS in .env (npm run buffer:channels), then: npm run autopilot -- --force"
