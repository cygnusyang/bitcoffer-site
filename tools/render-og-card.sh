#!/bin/sh
# 重新渲染社交分享卡片（1200×630）。需要本机有 Google Chrome。
# 用法：tools/render-og-card.sh
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Google Chrome 不在默认路径，改这里的 CHROME 变量" >&2; exit 1; }
PROFILE="$(mktemp -d /tmp/bitcoffer-og.XXXXXX)"
"$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --virtual-time-budget=2500 \
  --user-data-dir="$PROFILE" --window-size=1200,630 \
  --screenshot=assets/og-card.png "file://$PWD/tools/og-card.html" 2>&1 \
  | grep -F 'written to file' || true
rm -rf "$PROFILE"
file assets/og-card.png
