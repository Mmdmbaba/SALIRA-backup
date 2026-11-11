import { registerWarpDevice } from "@/lib/warp-server";
import { probeWarpEndpoint, type HandshakeKeys } from "@/lib/wg-handshake";

/**
 * Shared WARP probe-device pool for /api/scan and /api/stats.
 * Keeps ONE registered device in memory (max 10 min) — but only after it
 * passed a live canary handshake, so a dead cached device can never poison
 * a whole scan round.
 */

interface DeviceCache {
  keys: HandshakeKeys;
  at: number;
  validated: boolean;
}

let cache: DeviceCache | null = null;

/** Canonical endpoint used to validate our probe device. */
export const CANARY = { ip: "162.159.192.1", port: 2408 };

export async function getProbeKeys(): Promise<HandshakeKeys> {
  if (cache && cache.validated && Date.now() - cache.at < 10 * 60 * 1000) {
    return cache.keys;
  }

  for (let i = 0; i < 2; i++) {
    try {
      const device = await registerWarpDevice();
      const keys: HandshakeKeys = {
        privateKey: device.privateKey,
        peerPublicKey: device.peerPublicKey,
      };
      const check = await probeWarpEndpoint(CANARY.ip, CANARY.port, keys, 2200);
      cache = { keys, at: Date.now(), validated: check.alive };
      if (check.alive) return keys;
      // direct registrations are trusted even if the canary flakes once
      if (device.registerSource === "cloudflare-direct" && i === 0) {
        const retry = await probeWarpEndpoint(CANARY.ip, CANARY.port, keys, 2200);
        cache = { keys, at: Date.now(), validated: retry.alive };
        return keys;
      }
    } catch {
      /* try again */
    }
  }

  throw new Error("could not obtain a working probe device");
}
