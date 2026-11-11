"use client";

/**
 * Client-side local scan engine.
 *
 * Runs in the USER's browser so results reflect their own carrier.
 * Browsers cannot send UDP, so we probe each candidate IP on TCP 443
 * (the only TCP port Cloudflare serves on these ranges) using fetch()
 * and measure how fast the request FAILS:
 *   - fast failure  → TCP reached the host (TLS/cert rejected after) = alive
 *   - slow timeout  → filtered / unreachable = dead
 */

export interface LocalProbeResult {
  ip: string;
  alive: boolean;
  ms: number | null;
}

/** Probe one IP via fetch timing. Returns null when unreachable. */
export async function probeLocal(ip: string, timeoutMs = 3000): Promise<LocalProbeResult> {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`https://${ip}/`, {
      mode: "no-cors",
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    // got a response (opaque) — definitely reachable
    return { ip, alive: true, ms: Math.round(performance.now() - t0) };
  } catch {
    const dt = performance.now() - t0;
    const timedOut = dt >= timeoutMs - 60;
    return { ip, alive: !timedOut, ms: timedOut ? null : Math.round(dt) };
  } finally {
    clearTimeout(timer);
  }
}

/** Run probes with a concurrency pool; onProgress reports incremental completions. */
export async function runLocalScan(
  ips: string[],
  opts: {
    timeoutMs?: number;
    concurrency?: number;
    onProgress?: (r: LocalProbeResult) => void;
    shouldStop?: () => boolean;
  } = {}
): Promise<LocalProbeResult[]> {
  const { timeoutMs = 3000, concurrency = 16, onProgress, shouldStop } = opts;
  const queue = [...ips];
  const out: LocalProbeResult[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      if (shouldStop?.()) return;
      const ip = queue.shift()!;
      const r = await probeLocal(ip, timeoutMs);
      out.push(r);
      onProgress?.(r);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ips.length) }, () => worker())
  );
  return out;
}

/** Build a random sample of IPs from the chosen ranges. */
export function sampleIps(
  ranges: { base: string; from: number; to: number }[],
  perRange: number
): string[] {
  const ips: string[] = [];
  for (const r of ranges) {
    const pool = new Set<number>();
    const n = Math.min(perRange, r.to - r.from + 1);
    while (pool.size < n) pool.add(Math.floor(Math.random() * (r.to - r.from + 1)) + r.from);
    for (const host of pool) ips.push(`${r.base}${host}`);
  }
  return ips;
}
