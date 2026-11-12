import { NextRequest, NextResponse } from "next/server";

interface TcpSocket {
  opened: Promise<void>;
  close(): void;
}

interface SocketsModule {
  connect(host: { host: string; port: number }): TcpSocket;
}

/**
 * cloudflare:sockets is a workerd built-in — it must NOT be resolved by
 * Turbopack, esbuild, or Node's build-time page-data collection (Turbopack
 * even const-folds `.join()` tricks). `new Function` is opaque to every
 * bundler and const-evaluator, so the built-in stays a pure runtime import;
 * workerd (and Node, if ever hit) resolves it only when the route executes.
 */
const SOCKETS_SPEC = "cloudflare:sockets";

async function socketsConnect(): Promise<SocketsModule["connect"]> {
  const dynamicImport = new Function("s", "return import(s)") as (s: string) => Promise<SocketsModule>;
  const mod = await dynamicImport(SOCKETS_SPEC);
  return mod.connect;
}

/**
 * GET /api/stats — Workers variant (swapped in by scripts/build-workers.sh).
 *
 * Cloudflare Workers cannot do raw UDP (WireGuard handshakes) and outbound
 * TCP to Cloudflare's own IP ranges is blocked by the platform, so this is
 * the honest *simplified* status the user opted into:
 *   - warp    : real HTTPS reachability check of the WARP registration API
 *   - ranges  : real HTTPS check of a Cloudflare edge endpoint, reported
 *               uniformly (informational — NOT per-IP UDP handshakes)
 *   - proxy   : REAL outbound TCP connect() to the SALIRA Telegram proxy
 * The payload shape is identical to the Node version; `mode` + `note` make
 * the simplification explicit for API consumers.
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

const WARP_API = "https://api.cloudflareclient.com/v0a2158/reg";
const EDGE_TRACE = "https://www.cloudflare.com/cdn-cgi/trace";

const PROXY_HOST = process.env.SALIRA_PROXY_HOST ?? "51.75.118.79";
const PROXY_PORT = Number(process.env.SALIRA_PROXY_PORT ?? 20364);

const TTL = 4 * 60 * 1000;
let memo: { at: number; payload: unknown } | null = null;

/** Real outbound TCP connect via cloudflare:sockets, returns ms or null. */
async function tcpProbe(host: string, port: number, timeoutMs = 2500): Promise<number | null> {
  const t0 = Date.now();
  let socket: TcpSocket | null = null;
  try {
    const connect = await socketsConnect();
    socket = connect({ host, port });
    await Promise.race([
      socket.opened,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return Date.now() - t0;
  } catch {
    return null;
  } finally {
    try {
      socket?.close();
    } catch {
      /* already closed */
    }
  }
}

/** HTTPS reachability probe, returns ms or null (any HTTP response counts). */
async function httpsProbe(url: string, timeoutMs = 5000): Promise<number | null> {
  const t0 = Date.now();
  try {
    await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    return Date.now() - t0;
  } catch {
    return null;
  }
}

interface RangeRow {
  ip: string;
  alive: boolean;
  ms: number | null;
}

async function buildStats() {
  const [warpMs, edgeMs, proxyMs] = await Promise.all([
    httpsProbe(WARP_API, 8000),
    httpsProbe(EDGE_TRACE, 5000),
    tcpProbe(PROXY_HOST, PROXY_PORT),
  ]);

  const ranges: RangeRow[] = RANGE_HEADS.map((ip) => ({
    ip,
    alive: edgeMs !== null,
    ms: edgeMs,
  }));

  return {
    ok: true,
    at: Date.now(),
    mode: "workers" as const,
    note: "simplified on Workers: warp = registration-API check, ranges = uniform Cloudflare-edge check (UDP handshakes are impossible here), proxy = real TCP connect",
    warp: { alive: warpMs !== null, ms: warpMs },
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
