#!/usr/bin/env bash
# ساخت خروجی استاتیک SALIRA برای GitHub Pages — نتیجه در out/
# استفاده: bash scripts/build-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OWNER="${OWNER:-Mmdmbaba}"
REPO_SLUG="${REPO_SLUG:-salira}"

export EXPORT_STATIC=1
export NEXT_PUBLIC_BASE_PATH="/${REPO_SLUG}"
export NEXT_PUBLIC_STATIC_DEMO=1
export NEXT_PUBLIC_SITE_URL="https://${OWNER}.github.io/${REPO_SLUG}"

# Route handler ها به سرور Node نیاز دارند — در بیلد استاتیک کنار می‌روند
API_DIR="src/app/api"
STASH="$(mktemp -d)"
restore() {
  if [ ! -d "$API_DIR" ] && [ -d "$STASH/api" ]; then
    mv "$STASH/api" "$API_DIR"
  fi
  rm -rf "$STASH"
}
trap restore EXIT

if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$STASH/api"
  echo "[build-pages] API routes moved aside: $STASH/api"
fi

rm -rf .next out
./node_modules/.bin/next build

restore

# GitHub Pages نباید Jekyll را روی _next/ اجرا کند
touch out/.nojekyll

echo "[build-pages] OK → out/ ($(du -sh out | cut -f1))"
ls out | head -8
