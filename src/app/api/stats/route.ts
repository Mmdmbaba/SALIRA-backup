import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import { getProbeKeys } from "@/lib/probe-device";
import { probeWarpEndpoint } from "@/lib/wg-handshake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stats — live status for the home dashboard.
 * Real probes only, cached in memory for 4 minutes:
 *   - warp    : canary WireGuard handshake
 *   - ranges  : one handshake against the head of each official CF range
 *   - proxy   : TCP reachability of the SALIRA Telegram proxy
 * Nothing about the visitor is stored; responses are not persisted.
 */

const RANGE_HEADS = [
  "162.159.192.1",
  "162.159.193.1",
  "162.159.195.1",
  "188.114.96.1",
  "188.114.97.1",
  "188.114.98.1",
  "188.114.99.1",
];

const PROXY_HOST = process.env.SALIRA_PROXY_HOST ?? "51.75.118.79";
const PROXY_PORT = Number(process.env.SALIRA_PROXY_PORT ?? 20364);

const TTL = 4 * 60 * 1000;
let memo: { at: number; payload: unknown } | null = null;

/** Single TCP connect probe with latency measurement. */
function tcpProbe(host: string, port: number, timeoutMs = 2500): Promise<number | null> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const socket = new net.Socket();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok ? Date.now() - t0 : null);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    try {
      socket.connect(port, host);
    } catch {
      done(false);
    }
  });
}

interface RangeRow {
  ip: string;
  alive: boolean;
  ms: number | null;
}

async function probeRanges(): Promise<RangeRow[]> {
  let keys: Awaited<ReturnType<typeof getProbeKeys>>;
  try {
    keys = await getProbeKeys();
  } catch {
    return RANGE_HEADS.map((ip) => ({ ip, alive: false, ms: null }));
  }
  const rows = await Promise.all(
    RANGE_HEADS.map(async (ip): Promise<RangeRow> => {
      try {
        const r = await probeWarpEndpoint(ip, 2408, keys, 2200);
        return { ip, alive: r.alive, ms: r.alive ? r.ms : null };
      } catch {
        return { ip, alive: false, ms: null };
      }
    })
  );
  return rows;
}

async function buildStats() {
  const keysPromise = getProbeKeys().catch(() => null);
  const [keys, proxyMs] = await Promise.all([keysPromise, tcpProbe(PROXY_HOST, PROXY_PORT)]);

  // one handshake per range head — concurrent with a small stagger
  const ranges: RangeRow[] = await (async () => {
    if (!keys) return RANGE_HEADS.map((ip) => ({ ip, alive: false, ms: null }));
    return Promise.all(
      RANGE_HEADS.map(async (ip, i): Promise<RangeRow> => {
        // small stagger so 7 handshakes don't burst the same peer key at once
        await new Promise((r) => setTimeout(r, i * 130));
        try {
          const r = await probeWarpEndpoint(ip, 2408, keys, 1400, 2);
          return { ip, alive: r.alive, ms: r.alive ? r.ms : null };
        } catch {
          return { ip, alive: false, ms: null };
        }
      })
    );
  })();

  // 162.159.192.1 IS the first range head — reuse its result as the WARP-core
  // canary instead of firing a duplicate concurrent handshake (which used to
  // cause dropped replies and false negatives).
  const canary = ranges.find((r) => r.ip === "162.159.192.1");
  const warp = canary ?? { alive: false, ms: null };

  return {
    ok: true,
    at: Date.now(),
    warp,
    ranges,
    proxy: { alive: proxyMs !== null, ms: proxyMs, host: `${PROXY_HOST}:${PROXY_PORT}` },
  };
}

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  if (!refresh && memo && Date.now() - memo.at < TTL) {
    return NextResponse.json(memo.payload);
  }
  try {
    const payload = await buildStats();
    memo = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
