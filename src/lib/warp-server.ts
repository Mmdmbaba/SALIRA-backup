/**
 * SALIRA — server-side Cloudflare WARP registration.
 * Two privacy modes:
 *  - client key: the browser generates the x25519 keypair and only the
 *    PUBLIC key reaches this server (privateKey is returned empty).
 *  - server key: legacy fallback, keypair generated here, returned once.
 *
 * The server NEVER stores or logs keys. Everything lives in the response
 * body only. Optional WARP+ license attach (best-effort).
 */

import "server-only";
import crypto from "crypto";
import type { WarpDevice } from "./awg";

const WARP_API = "https://api.cloudflareclient.com/v0a2158/reg";
const UA = "okhttp/3.12.1";

/** Public relays (last-resort fallbacks) borrowed from the reference project. */
const WORKER_FALLBACKS = [
  "https://warp.configwireguard.workers.dev/",
  "https://warp.configwireguard2.workers.dev/",
  "https://warp.configwireguard3.workers.dev/",
  "https://warp.configwireguard4.workers.dev/",
];

export interface RegisterOptions {
  /** base64 x25519 public key generated in the browser (privacy mode) */
  publicKey?: string;
  /** optional WARP+ license to attach after registration */
  license?: string;
}

export class WarpRegisterError extends Error {
  code: "rate_limited" | "timeout" | "network" | "upstream";
  constructor(code: WarpRegisterError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/* ------------------------- key handling ------------------------- */

function decodeBase64Key(b64: string): Buffer {
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) throw new WarpRegisterError("upstream", "invalid public key length");
  return buf;
}

function derivePublicKey(privB64: string): string {
  const privRaw = Buffer.from(privB64, "base64");
  const priv = crypto.createPrivateKey({
    key: Buffer.concat([Buffer.from("302e020100300506032b656e04220420", "hex"), privRaw]),
    format: "der",
    type: "pkcs8",
  });
  const der = crypto.createPublicKey(priv).export({ type: "spki", format: "der" }) as Buffer;
  return der.subarray(der.length - 32).toString("base64");
}

function generateX25519Keypair(): { privateKey: string; publicKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  const privRaw = privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
  const pubRaw = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  return {
    privateKey: privRaw.subarray(privRaw.length - 32).toString("base64"),
    publicKey: pubRaw.subarray(pubRaw.length - 32).toString("base64"),
  };
}

/* ------------------------- license attach ------------------------ */

async function attachLicense(deviceId: string, license: string): Promise<boolean> {
  try {
    const res = await fetch(`${WARP_API}/${deviceId}/account`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body: JSON.stringify({ license }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ----------------------- direct registration -------------------- */

interface WarpRegResponse {
  id: string;
  account: { id: string; account_type: string; license: string; created: string; warp_plus?: boolean };
  config: {
    client_id: string;
    peers: Array<{
      public_key: string;
      pre_shared_key?: string;
      endpoint: { v4: string; v6: string; host: string; ports?: number[] };
    }>;
    interface: { addresses: { v4: string; v6: string } };
  };
}

async function registerDirect(opts: RegisterOptions): Promise<{ device: WarpDevice; privateKey: string }> {
  let publicKey: string;
  let privateKey = "";

  if (opts.publicKey) {
    publicKey = decodeBase64Key(opts.publicKey).toString("base64");
  } else {
    const kp = generateX25519Keypair();
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
  }

  const body = JSON.stringify({
    key: publicKey,
    install_id: "",
    fcm_token: "",
    tos: new Date().toISOString(),
    model: "PC",
    serial_number: crypto.randomUUID(),
    locale: "en_US",
  });

  let res: Response;
  try {
    res = await fetch(WARP_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new WarpRegisterError("timeout", "WARP API timeout");
    }
    throw new WarpRegisterError("network", "network unreachable");
  }

  if (res.status === 429) throw new WarpRegisterError("rate_limited", "WARP API rate limited");
  if (!res.ok) throw new WarpRegisterError("upstream", `WARP API responded ${res.status}`);

  const data = (await res.json()) as WarpRegResponse;
  const peer = data.config.peers[0];

  let licenseApplied = false;
  if (opts.license && /^[A-Za-z0-9-]{6,}$/.test(opts.license.trim())) {
    licenseApplied = await attachLicense(data.id, opts.license.trim());
  }

  const v6Raw: string = peer.endpoint.v6 || "";
  const v6Host: string = v6Raw.replace(/^\[/, "").replace(/\]:\d+$/, "").replace(/:\d+$/, "");

  const device: WarpDevice = {
    deviceId: data.id,
    accountId: data.account.id,
    accountType: data.account.account_type,
    license: opts.license?.trim() || data.account.license,
    createdAt: data.account.created,
    warpPlus: Boolean(data.account.warp_plus) || licenseApplied,
    clientId: data.config.client_id,
    // in client-key mode the private key NEVER touches the server
    privateKey,
    addressV4: data.config.interface.addresses.v4,
    addressV6: data.config.interface.addresses.v6,
    peerPublicKey: peer.public_key,
    preSharedKey: peer.pre_shared_key,
    endpointHost: peer.endpoint.host || "engage.cloudflareclient.com:2408",
    endpointV6: v6Host,
    endpointPorts: peer.endpoint.ports || [2408],
    registerSource: "cloudflare-direct",
    licenseApplied,
    keySource: opts.publicKey ? "client" : "server",
  };

  return { device, privateKey };
}

/* --------------------- relayed registration --------------------- */

/** Parse a raw WireGuard INI config (used by the worker fallbacks). */
function parseWgIni(text: string): WarpDevice | null {
  const get = (key: string) => {
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "mi"));
    return m ? m[1].trim() : undefined;
  };

  const privateKey = get("PrivateKey");
  const address = get("Address") || "";
  const publicKey = get("PublicKey");
  const endpoint = get("Endpoint") || "engage.cloudflareclient.com:2408";

  if (!privateKey || !publicKey) return null;

  const addresses = address.split(",").map((a) => a.trim());
  const v4 = addresses.find((a) => a.includes(".") && !a.includes("/")) || addresses[0] || "172.16.0.2";
  const v6 = addresses.find((a) => a.includes(":")) || "2606:4700:110:8888::1";

  return {
    deviceId: "unknown",
    accountId: "unknown",
    accountType: "free",
    license: "unknown",
    createdAt: new Date().toISOString(),
    warpPlus: false,
    clientId: "",
    privateKey,
    addressV4: v4,
    addressV6: v6,
    peerPublicKey: publicKey,
    preSharedKey: get("PresharedKey"),
    endpointHost: endpoint,
    endpointV6: "",
    endpointPorts: [2408],
    registerSource: "worker-relay",
    keySource: "server",
  };
}

async function registerViaWorkers(): Promise<WarpDevice> {
  const shuffled = [...WORKER_FALLBACKS].sort(() => Math.random() - 0.5);

  for (const url of shuffled) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();

      let configText = text;
      try {
        const json = JSON.parse(text) as { config?: string };
        if (json.config) configText = json.config;
      } catch {
        /* raw INI */
      }

      const device = parseWgIni(configText);
      if (device) return device;
    } catch {
      /* try next */
    }
  }
  throw new WarpRegisterError("upstream", "All worker relays failed");
}

/* ----------------------------- API ------------------------------ */

export async function registerWarpDevice(opts: RegisterOptions = {}): Promise<WarpDevice> {
  const { device } = await registerDirect(opts);
  return device;
}

/** Fallback used when direct registration fails and no client key is involved. */
export async function registerWithFallback(opts: RegisterOptions = {}): Promise<WarpDevice> {
  try {
    return (await registerDirect(opts)).device;
  } catch (e) {
    if (opts.publicKey) {
      // privacy mode cannot use the anonymous worker relays — surface the error
      throw e;
    }
    return registerViaWorkers();
  }
}

export { derivePublicKey };
