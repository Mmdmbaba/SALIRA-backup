#!/usr/bin/env bash
# Deploy SALIRA to Cloudflare Workers.
# Needs an API token with "Workers Scripts: Edit" permission (Account-level).
# Put the token in .credentials/cloudflare.token or export CLOUDFLARE_API_TOKEN.
# Optional: CLOUDFLARE_ACCOUNT_ID (needed if the token sees several accounts).
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN_FILE=".credentials/cloudflare.token"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$TOKEN_FILE" ]; then
  CLOUDFLARE_API_TOKEN=$(tr -d '\r\n' < "$TOKEN_FILE")
  export CLOUDFLARE_API_TOKEN
fi
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ توکن کلادفلر یافت نشد: $TOKEN_FILE"
  echo "   توکنی با مجوز Workers Scripts: Edit بساز و محتوایش را در این فایل بگذار."
  exit 1
fi
if [ ! -d ".open-next" ]; then
  echo "❌ خروجی بیلد نیست — اول: bash scripts/build-workers.sh"
  exit 1
fi

echo "[deploy-workers] wrangler deploy ..."
bunx wrangler deploy 2>&1 | tee /tmp/wrangler-deploy.log

URL=$(grep -oE "https://[a-z0-9.-]+\.workers\.dev" /tmp/wrangler-deploy.log | head -1 || true)
if [ -n "$URL" ]; then
  echo "[deploy-workers] در انتظار انتشار روی $URL ..."
  for i in $(seq 1 20); do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL" || echo 000)
    [ "$CODE" = "200" ] && { echo "[deploy-workers] LIVE: $URL"; exit 0; }
    sleep 5
  done
  echo "⚠️  هنوز 200 نشد (کد آخر: $CODE) — چند دقیقه بعد دوباره چک کن: $URL"
else
  echo "⚠️  URL از خروجی wrangler خوانده نشد — لاگ: /tmp/wrangler-deploy.log"
fi
