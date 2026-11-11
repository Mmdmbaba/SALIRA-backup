import { NextRequest, NextResponse } from "next/server";
import { registerWithFallback, WarpRegisterError } from "@/lib/warp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/warp
 * Body (optional JSON): { publicKey?: string, license?: string }
 *
 * Privacy: when the browser sends its own publicKey, the private key is
 * generated client-side and NEVER reaches or is stored on this server
 * (the response contains privateKey: ""). Nothing is persisted or logged.
 */

/* small in-memory rate limiter: 12 registrations / minute / instance */
const WINDOW = 60_000;
let hits: number[] = [];
function rateLimited(): boolean {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW);
  if (hits.length >= 12) return true;
  hits.push(now);
  return false;
}

interface Body {
  publicKey?: string;
  license?: string;
}

export async function POST(req: NextRequest) {
  if (rateLimited()) {
    return NextResponse.json(
      { ok: false, code: "rate_limited", error: "Too many registrations, wait a minute." },
      { status: 429 }
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const publicKey =
    typeof body.publicKey === "string" && body.publicKey.length > 0 ? body.publicKey : undefined;
  const license =
    typeof body.license === "string" && body.license.trim().length > 0 ? body.license : undefined;

  if (publicKey && !/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) {
    return NextResponse.json(
      { ok: false, code: "bad_key", error: "invalid public key" },
      { status: 400 }
    );
  }

  try {
    const device = await registerWithFallback({ publicKey, license });
    return NextResponse.json({ ok: true, device });
  } catch (error) {
    if (error instanceof WarpRegisterError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.code === "rate_limited" ? 429 : 502 }
      );
    }
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ ok: false, code: "upstream", error: message }, { status: 502 });
  }
}
