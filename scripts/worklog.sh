#!/usr/bin/env bash
# افزودن ورودی به لاگ — استفاده: bash scripts/worklog.sh "عنوان مرحله" ["جزئیات"]
set -euo pipefail
cd "$(dirname "$0")/.."

TITLE="${1:?عنوان مرحله لازم است}"
DETAIL="${2:-}"
TS="$(date -u '+%Y-%m-%d %H:%M UTC')"

{
  echo ""
  echo "### ${TS} — ${TITLE}"
  if [ -n "$DETAIL" ]; then
    echo ""
    echo "${DETAIL}"
  fi
  echo ""
} >> WORKLOG.md

echo "[worklog] ورودی «${TITLE}» به WORKLOG.md اضافه شد. (یادت نره بخش «وضعیت فعلی» رو هم آپدیت کنی)"
