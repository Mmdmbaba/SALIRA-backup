#!/usr/bin/env bash
# دیپلوی خروجی استاتیک روی GitHub Pages
# پیش‌نیاز:
#   1) توکن با دسترسی repo در .credentials/github.token
#   2) خروجی out/ از scripts/build-pages.sh
# استفاده: bash scripts/deploy-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OWNER="${OWNER:-Mmdmbaba}"
REPO="${REPO_SLUG:-salira}"
PUSH_BRANCH="${PUSH_BRANCH:-main}"   # gh-pages وقتی ریپو مال بکاپ/سورس است تا main دست نخورد
WAIT="${WAIT_FOR_PUBLISH:-1}"
TOKEN_FILE=".credentials/github.token"
SITE_URL="https://${OWNER,,}.github.io/${REPO}/"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "❌ توکن یافت نشد: $TOKEN_FILE"
  echo "   یک fine-grained/classic token با دسترسی repo بساز و محتوایش را در این فایل بگذار."
  exit 1
fi
if [ ! -f "out/index.html" ]; then
  echo "❌ خروجی استاتیک نیست — اول: bash scripts/build-pages.sh"
  exit 1
fi

TOKEN="$(cat "$TOKEN_FILE" | tr -d '\r\n')"
API="https://api.github.com"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

# ── ۱) ساخت ریپوی عمومی (در صورت نبود) ─────────────────────────────────
HTTP=$(curl -s -o /tmp/repo.json -w '%{http_code}' "${AUTH[@]}" "$API/repos/$OWNER/$REPO")
if [ "$HTTP" = "404" ]; then
  echo "[deploy] ساختن ریپوی عمومی $OWNER/$REPO ..."
  HTTP=$(curl -s -o /tmp/repo.json -w '%{http_code}' "${AUTH[@]}" -X POST "$API/user/repos" \
    -d "{\"name\":\"$REPO\",\"private\":false,\"has_issues\":false,\"has_wiki\":false,\"has_projects\":false,\"description\":\"SALIRA — VPN config studio (static site)\"}")
  if [ "$HTTP" != "201" ]; then
    echo "❌ ساخت ریپو ناموفق (HTTP $HTTP):"; cat /tmp/repo.json | head -5; exit 1
  fi
else
  echo "[deploy] ریپو از قبل موجود است ($HTTP)"
fi

# ── ۲) push خروجی به شاخه هدف ───────────────────────────────────────────
echo "[deploy] push محتوای out/ به شاخه ${PUSH_BRANCH} ..."
rm -rf out/.git
cd out
git init -q -b "$PUSH_BRANCH"
git add -A
git -c user.name="Mmdmbaba" -c user.email="Mmdmbaba@users.noreply.github.com" \
  commit -qm "deploy: static build $(date -u '+%Y-%m-%d %H:%M UTC')"
git remote add origin "https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git"
git push -q -f origin "$PUSH_BRANCH"
cd ..

# ── ۳) فعال‌سازی Pages (build from branch) ──────────────────────────────
echo "[deploy] فعال‌سازی GitHub Pages ..."
HTTP=$(curl -s -o /tmp/pages.json -w '%{http_code}' "${AUTH[@]}" -X POST "$API/repos/$OWNER/$REPO/pages" \
  -d "{\"build_type\":\"legacy\",\"source\":{\"branch\":\"${PUSH_BRANCH}\",\"path\":\"/\"}}")
case "$HTTP" in
  201|202) echo "[deploy] Pages فعال شد" ;;
  409)     echo "[deploy] Pages از قبل فعال است" ;;
  *) echo "⚠️  پاسخ Pages (HTTP $HTTP):"; cat /tmp/pages.json | head -8 ;;
esac

# ── ۴) انتظار برای انتشار (WAIT_FOR_PUBLISH=0 برای رد شدن) ─────────────
if [ "$WAIT" = "0" ]; then
  echo "[deploy] بررسی انتشار رد شد (WAIT_FOR_PUBLISH=0). آدرس: $SITE_URL"
  exit 0
fi
echo "[deploy] بررسی انتشار در $SITE_URL ..."
for i in $(seq 1 30); do
  sleep 10
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL")
  if [ "$CODE" = "200" ]; then
    echo "✅ سایت زنده است: $SITE_URL"
    exit 0
  fi
  echo "  ... ($i/30) کد $CODE"
done
echo "⏳ هنوز منتشر نشده — چند دقیقه بعد دستی چک کن: $SITE_URL"
