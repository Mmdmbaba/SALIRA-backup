#!/usr/bin/env bash
# ادامه کار بعد از قطعی — همیشه اول این را اجرا کن: bash scripts/resume.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "════════ وضعیت فعلی (از WORKLOG) ════════"
awk '/^## وضعیت فعلی/{f=1} /^## لاگ/{f=0} f' WORKLOG.md

echo ""
echo "════════ ۵ مرحله آخر لاگ ════════"
grep -n '^### ' WORKLOG.md | tail -5 || echo "(لاگی نیست)"

echo ""
echo "════════ وضعیت Git ════════"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
git fetch origin "$BRANCH" --quiet 2>/dev/null || true
if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
  echo "جلو/عقب نسبت به ریموت: $(git rev-list --left-right --count "HEAD...origin/$BRANCH")"
  git pull --rebase origin "$BRANCH" 2>/dev/null || true
fi
git log --oneline -5
echo ""
echo "فایل‌های تغییر-کرده/جدید:"
git status -s || true
echo ""
echo "جزئیات آخرین مرحله: tail -n 60 WORKLOG.md"
