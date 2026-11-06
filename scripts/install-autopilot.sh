#!/usr/bin/env bash
# Install (or remove) the daily launchd agent that runs the autopilot on this Mac.
# Usage: bash scripts/install-autopilot.sh [--hour 10] [--minute 30] | bash scripts/install-autopilot.sh --uninstall
set -euo pipefail
LABEL="it.risthome.autopilot"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOUR=10; MINUTE=30
while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true; rm -f "$PLIST"; echo "removed $LABEL"; exit 0 ;;
    --hour) HOUR="$2"; shift ;;
    --minute) MINUTE="$2"; shift ;;
  esac
  shift
done
NODE="$(command -v node)"
mkdir -p "$REPO/logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>--env-file-if-exists=.env</string><string>scripts/autopilot.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>$HOUR</integer><key>Minute</key><integer>$MINUTE</integer></dict>
  <key>StandardOutPath</key><string>$REPO/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$REPO/logs/launchd.log</string>
  <key>RunAtLoad</key><false/>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL: daily at $(printf '%02d:%02d' "$HOUR" "$MINUTE"), logs in $REPO/logs/ (run now: launchctl kickstart gui/$(id -u)/$LABEL)"
