import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/proxy/kata — semi-automatic MTProto deployment orchestrator.
 *
 * Actions (one small idempotent step per request, the client wizard drives
 * the sequence and shows REAL per-stage progress):
 *   list   { apiKey }                        → servers with ip:port + state
 *   setvar { apiKey, serverId }              → PY_PACKAGES=cryptography
 *   write  { apiKey, serverId, tlsDomain? }  → app.py + config.py (returns secret)
 *   power  { apiKey, serverId, signal }      → start | restart | stop
 *   poll   { apiKey, serverId }              → { state }
 *
 * SECURITY: the API key lives in the memory of this single request only —
 * it is never persisted, never logged, never echoed back.
 * Rate limit: 12 requests / minute / IP.
 */

const BASE = (process.env.SALIRA_PANEL_BASE ?? "https://control.katabump.com").replace(/\/$/, "");
const TLS_DOMAINS = ["cdn.jsdelivr.net", "www.cloudflare.com", "tools.ietf.org"];

type ErrCode = "auth" | "notfound" | "panel" | "network" | "bad_request" | "tls_domain";

class ApiError extends Error {
  code: ErrCode;
  status: number;
  constructor(code: ErrCode, status = 502, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

/* --------------------------- rate limiting --------------------------- */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > 12;
}

/* --------------------------- panel client ---------------------------- */
async function panel<T>(apiKey: string, urlPath: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${urlPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("network", 504);
  }
  if (res.status === 401 || res.status === 403) throw new ApiError("auth", 401);
  if (res.status === 404) throw new ApiError("notfound", 404);
  if (res.status === 429) throw new ApiError("panel", 429, "panel rate limit");
  if (!res.ok) throw new ApiError("panel", 502, `panel http ${res.status}`);
  return (await res.json()) as T;
}

interface PtyServerAttrs {
  identifier: string;
  name: string;
  relationships?: {
    allocations?: { data: Array<{ attributes: { ip: string; port: number } }> };
  };
}
interface PtyListResponse {
  data: Array<{ attributes: PtyServerAttrs }>;
}
interface PtyResourcesResponse {
  attributes: { current_state: string };
}
interface PtyStartupResponse {
  variables: Array<{ env_variable: string; value: string }>;
}

/* --------------------------- config writer --------------------------- */
function hexOf(s: string): string {
  return [...Buffer.from(s, "utf8")].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildConfigPy(port: number, secret: string, tlsDomain: string): string {
  return `PORT = ${port}

# name -> secret (32 hex chars)
USERS = {
    "tg":  "${secret}",
}

MODES = {
    # Classic mode, easy to detect
    "classic": False,

    # Makes the proxy harder to detect
    "secure": True,

    # FakeTLS - looks like HTTPS traffic
    "tls": True
}

# The domain for TLS mode, bad clients are proxied there
# Use random existing domain, proxy checks it on start
TLS_DOMAIN = "${tlsDomain}"
`;
}

async function appPy(): Promise<string> {
  // the alexbers/mtprotoproxy core, already patched for modern Python (Task 1)
  const p = path.join(process.cwd(), "mtproto", "app.py");
  return readFile(p, "utf8");
}

function linksFor(ip: string, port: number, secret: string, tlsDomain: string) {
  const eeSecret = `ee${secret}${hexOf(tlsDomain)}`;
  const ddSecret = `dd${secret}`;
  return {
    ee: `tg://proxy?server=${ip}&port=${port}&secret=${eeSecret}`,
    dd: `tg://proxy?server=${ip}&port=${port}&secret=${ddSecret}`,
    eeShare: `https://t.me/proxy?server=${ip}&port=${port}&secret=${eeSecret}`,
    ddShare: `https://t.me/proxy?server=${ip}&port=${port}&secret=${ddSecret}`,
  };
}

/* ------------------------------ handler ------------------------------ */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  let body: {
    action?: string;
    apiKey?: string;
    serverId?: string;
    signal?: string;
    tlsDomain?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  const action = body.action ?? "";
  if (!apiKey || apiKey.length < 10 || !action) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const serverId = (body.serverId ?? "").trim();

  try {
    switch (action) {
      /* ---- list servers with allocation + state ---- */
      case "list": {
        const list = await panel<PtyListResponse>(apiKey, "/api/client");
        const servers = await Promise.all(
          (list.data ?? []).slice(0, 8).map(async (s) => {
            const id = s.attributes.identifier;
            const [detail, res] = await Promise.all([
              panel<{ attributes: PtyServerAttrs }>(
                apiKey,
                `/api/client/servers/${id}?include=allocations`
              ).catch(() => null),
              panel<PtyResourcesResponse>(apiKey, `/api/client/servers/${id}/resources`).catch(
                () => null
              ),
            ]);
            const alloc = detail?.attributes?.relationships?.allocations?.data?.[0]?.attributes;
            return {
              id,
              name: s.attributes.name,
              ip: alloc?.ip ?? null,
              port: alloc?.port ?? null,
              state: res?.attributes?.current_state ?? "unknown",
            };
          })
        );
        return NextResponse.json({ ok: true, servers });
      }

      /* ---- PY_PACKAGES=cryptography ---- */
      case "setvar": {
        if (!serverId) throw new ApiError("bad_request", 400);
        const startup = await panel<PtyStartupResponse>(
          apiKey,
          `/api/client/servers/${serverId}/startup`
        );
        const has = (startup.variables ?? []).some((v) => v.env_variable === "PY_PACKAGES");
        if (!has) {
          // egg has no PY_PACKAGES variable — not fatal, cryptography may already exist
          return NextResponse.json({ ok: true, applied: false });
        }
        await panel(apiKey, `/api/client/servers/${serverId}/startup/variable`, {
          method: "PUT",
          body: JSON.stringify({ key: "PY_PACKAGES", value: "cryptography" }),
        });
        return NextResponse.json({ ok: true, applied: true });
      }

      /* ---- write app.py + config.py, return the fresh secret ---- */
      case "write": {
        if (!serverId) throw new ApiError("bad_request", 400);
        const tlsDomain = (body.tlsDomain ?? TLS_DOMAINS[0]).trim().toLowerCase();
        if (!TLS_DOMAINS.includes(tlsDomain)) throw new ApiError("tls_domain", 400);

        const detail = await panel<{ attributes: PtyServerAttrs }>(
          apiKey,
          `/api/client/servers/${serverId}?include=allocations`
        );
        const alloc = detail.attributes?.relationships?.allocations?.data?.[0]?.attributes;
        if (!alloc?.ip || !alloc?.port) throw new ApiError("notfound", 404, "no allocation");

        const secret = randomBytes(16).toString("hex");
        const [core] = await Promise.all([appPy()]);
        const cfg = buildConfigPy(alloc.port, secret, tlsDomain);
        const write = (file: string, raw: string) =>
          panel(apiKey, `/api/client/servers/${serverId}/files/write`, {
            method: "POST",
            body: JSON.stringify({ root: "/", file, raw }),
          });

        await Promise.all([write("app.py", core), write("config.py", cfg)]);

        return NextResponse.json({
          ok: true,
          ip: alloc.ip,
          port: alloc.port,
          secret,
          tlsDomain,
          name: detail.attributes?.name ?? "",
          links: linksFor(alloc.ip, alloc.port, secret, tlsDomain),
        });
      }

      /* ---- power ---- */
      case "power": {
        if (!serverId) throw new ApiError("bad_request", 400);
        const signal = body.signal ?? "restart";
        if (!["start", "restart", "stop"].includes(signal)) {
          throw new ApiError("bad_request", 400);
        }
        await panel(apiKey, `/api/client/servers/${serverId}/power`, {
          method: "POST",
          body: JSON.stringify({ signal }),
        });
        return NextResponse.json({ ok: true, signal });
      }

      /* ---- poll current state ---- */
      case "poll": {
        if (!serverId) throw new ApiError("bad_request", 400);
        const res = await panel<PtyResourcesResponse>(
          apiKey,
          `/api/client/servers/${serverId}/resources`
        );
        return NextResponse.json({ ok: true, state: res.attributes?.current_state ?? "unknown" });
      }

      default:
        return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const map: Record<ErrCode, string> = {
        auth: "auth",
        notfound: "notfound",
        panel: "panel",
        network: "network",
        bad_request: "bad_request",
        tls_domain: "bad_request",
      };
      return NextResponse.json({ ok: false, code: map[error.code] }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "panel" }, { status: 502 });
  }
}
