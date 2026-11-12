import { NextResponse } from "next/server";

/**
 * Workers shim for POST /api/scan (swapped in by scripts/build-workers.sh).
 * Real server-side scanning needs UDP WireGuard handshakes (node:dgram),
 * which the Cloudflare Workers runtime cannot do. The client scanner detects
 * this and finishes with local results only.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "server_scan_unavailable",
      error:
        "WireGuard UDP handshakes are not possible on Cloudflare Workers — scanning finishes with local results only.",
    },
    { status: 501 }
  );
}
