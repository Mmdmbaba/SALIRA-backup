#!/usr/bin/env bash
# Build SALIRA for Cloudflare Workers via @opennextjs/cloudflare.
# Swaps the Node-only API routes (scan: UDP, stats: node:net) for Workers
# variants, runs the OpenNext build, then restores the originals.
# Output: .open-next/  (worker entry: .open-next/_worker.js)
set -euo pipefail
cd "$(dirname "$0")/.."

API_DIR="src/app/api"
STASH="$(mktemp -d)"
restore() {
  if [ -f "$STASH/stats-route-node.ts" ]; then mv "$STASH/stats-route-node.ts" "$API_DIR/stats/route.ts"; fi
  if [ -f "$STASH/scan-route-node.ts" ]; then mv "$STASH/scan-route-node.ts" "$API_DIR/scan/route.ts"; fi
  rm -rf "$STASH"
}
trap restore EXIT

echo "[build-workers] swap: stats → Workers variant، scan → shim 501"
mv "$API_DIR/stats/route.ts" "$STASH/stats-route-node.ts"
cp "$API_DIR/stats/route.workers.ts" "$API_DIR/stats/route.ts"
mv "$API_DIR/scan/route.ts" "$STASH/scan-route-node.ts"
cp "$API_DIR/scan/route.workers-shim.ts" "$API_DIR/scan/route.ts"

echo "[build-workers] next build + opennext build ..."
rm -rf .next .open-next
unset NEXT_PUBLIC_STATIC_DEMO NEXT_PUBLIC_BASE_PATH EXPORT_STATIC
BUILD_WORKERS=1 bunx opennextjs-cloudflare build

echo "[build-workers] OK → .open-next/ (worker: .open-next/worker.js)"
