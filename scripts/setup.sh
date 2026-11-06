#!/usr/bin/env bash
# Everything that needs the human's GitHub/launchd permissions, in one run. Safe to re-run:
# values already present in .env are kept.
#   bash scripts/setup.sh
# 1) push this code repo, 2) media host (kept if already configured, otherwise a separate
# public repo served by GitHub Pages), 3) .env media settings, 4) daily launchd agent.
# Afterwards: BUFFER_API_KEY and BUFFER_CHANNELS (dashboard: npm run dashboard, or .env).
set -euo pipefail
cd "$(dirname "$0")/.."
CODE_REPO="${GITHUB_REPO:-GabrieleCalderone/AIFACTORY}"
[ -f .env ] || cp .env.example .env
envval() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

echo "== 1/4 code repo: push to $CODE_REPO (visibility: $(gh repo view "$CODE_REPO" --json visibility --jq .visibility))"
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin "https://github.com/$CODE_REPO.git"; fi
git push -u origin main

echo "== 2/4 media host"
if [ -n "$(envval MEDIA_REPO_DIR)" ] && [ -n "$(envval MEDIA_BASE_URL)" ]; then
  echo "already configured: $(envval MEDIA_BASE_URL) (dir $(envval MEDIA_REPO_DIR), subdir '$(envval MEDIA_SUBDIR)')"
  if [ "$(envval MEDIA_REPO_DIR)" = "$(pwd)" ]; then
    mkdir -p "$(envval MEDIA_SUBDIR)"; touch "$(envval MEDIA_SUBDIR)/.gitkeep" .nojekyll
    gh api "repos/$CODE_REPO/pages" --jq '"pages: " + .html_url + " (" + .status + ")"' 2>/dev/null || echo "pages: not enabled on $CODE_REPO (enable it in the repo settings, source main:/)"
  fi
else
  MEDIA_REPO="${MEDIA_REPO:-GabrieleCalderone/risthome-media}"
  MEDIA_DIR="${MEDIA_REPO_DIR:-$HOME/Projects/risthome-media}"
  bash scripts/setup-media-host.sh "$MEDIA_REPO" "$MEDIA_DIR"
  OWNER_LC="$(echo "$MEDIA_REPO" | cut -d/ -f1 | tr 'A-Z' 'a-z')"
  sed -i '' "s|^MEDIA_REPO_DIR=.*|MEDIA_REPO_DIR=$MEDIA_DIR|" .env
  sed -i '' "s|^MEDIA_BASE_URL=.*|MEDIA_BASE_URL=https://$OWNER_LC.github.io/$(echo "$MEDIA_REPO" | cut -d/ -f2)|" .env
  sed -i '' "s|^MEDIA_SUBDIR=.*|MEDIA_SUBDIR=|" .env
fi

echo "== 3/4 .env"
grep -q '^MEDIA_SUBDIR=' .env || echo "MEDIA_SUBDIR=" >> .env
echo "MEDIA_REPO_DIR=$(envval MEDIA_REPO_DIR)  MEDIA_BASE_URL=$(envval MEDIA_BASE_URL)  BUFFER key: $([ -n "$(envval BUFFER_API_KEY)" ] && echo set || echo missing)"

echo "== 4/4 daily launchd agent"
bash scripts/install-autopilot.sh --hour 10 --minute 30

echo
echo "Done. Next: npm run dashboard  (paste the Buffer key, detect channels, run a dry test)"
