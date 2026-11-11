import { NextRequest, NextResponse } from "next/server";
import { getProbeKeys } from "@/lib/probe-device";
import { probeWarpEndpoint } from "@/lib/wg-handshake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scan
 * Body: { targets: [{ ip, port }], timeoutMs?, concurrency? }
 *
 * Verifies each candidate endpoint with a REAL WireGuard handshake
 * over UDP from this server. Only endpoints whose handshake is answered
 * are reported alive. Max 64 targets per request.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      targets?: { ip: string; port: number }[];
      timeoutMs?: number;
      concurrency?: number;
    };

    const targets = (body.targets || []).slice(0, 64);
    if (targets.length === 0) {
      return NextResponse.json({ ok: false, error: "no targets" }, { status: 400 });
    }

    const timeoutMs = Math.min(Math.max(body.timeoutMs ?? 2500, 800), 5000);
    const concurrency = Math.min(Math.max(body.concurrency ?? 8, 1), 16);

    const keys = await getProbeKeys();
    const results: { ip: string; port: number; alive: boolean; ms: number | null }[] = [];

    let idx = 0;
    const worker = async () => {
      while (idx < targets.length) {
        const t = targets[idx++];
        const r = await probeWarpEndpoint(t.ip, t.port, keys, timeoutMs);
        results.push({ ip: t.ip, port: t.port, alive: r.alive, ms: r.alive ? r.ms : null });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
