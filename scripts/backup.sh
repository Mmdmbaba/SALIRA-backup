#!/usr/bin/env bash
# بکاپ فوری پروژه روی GitHub
# استفاده: bash scripts/backup.sh ["توضیح مرحله"]
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-به‌روزرسانی خودکار}"
TS="$(date -u '+%Y-%m-%d %H:%M UTC')"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"

git add -A
if git diff --cached --quiet; then
  echo "[backup] تغییر جدیدی برای commit نبود؛ فقط همگام‌سازی با ریموت بررسی می‌شود."
else
  git commit -m "backup: ${MSG} (${TS})"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git fetch origin "$BRANCH" --quiet || true
  if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
    if ! git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null; then
      echo "[backup] ریموت جلوتر از محلی است؛ rebase انجام می‌شود..."
      git pull --rebase origin "$BRANCH"
    fi
  fi
  git push origin "HEAD:${BRANCH}"
else
  echo "[backup] خطا: ریموت origin تنظیم نشده!"
  exit 1
fi

echo "[backup] OK — ذخیره شد روی GitHub (شاخه: ${BRANCH})"
git log --oneline -3
