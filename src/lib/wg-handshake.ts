/**
 * SALIRA — server-only WireGuard handshake prober.
 * Sends a REAL WireGuard handshake initiation over UDP and waits for the
 * handshake response. This is the only way to truthfully verify a WARP
 * endpoint works (WireGuard never answers invalid packets).
 */

import crypto from "crypto";
import dgram from "dgram";
import { aeadSealJs } from "./chacha-aead";

/* ------------------------------------------------------------------ */
/* BLAKE2s (pure JS — we need keyed + 16-byte MAC which node lacks)    */
/* ------------------------------------------------------------------ */

const IV = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

const SIGMA = new Uint8Array([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
  11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
  7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
  9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
  2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
  12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
  13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
  6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
  10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
]);

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

function g(v: Uint32Array, a: number, b: number, c: number, d: number, x: number, y: number) {
  v[a] = (v[a] + v[b] + x) >>> 0;
  v[d] = rotr(v[d] ^ v[a], 16);
  v[c] = (v[c] + v[d]) >>> 0;
  v[b] = rotr(v[b] ^ v[c], 12);
  v[a] = (v[a] + v[b] + y) >>> 0;
  v[d] = rotr(v[d] ^ v[a], 8);
  v[c] = (v[c] + v[d]) >>> 0;
  v[b] = rotr(v[b] ^ v[c], 7);
}

/** BLAKE2s digest, optional key (≤32 bytes), outlen 1..32 (standard BLAKE2 semantics). */
export function blake2s(data: Uint8Array, key?: Uint8Array, outlen = 32): Uint8Array {
  const kk = key ? key.length : 0;
  const h = new Uint32Array(IV);
  h[0] = (h[0] ^ (0x01010000 ^ (kk << 8) ^ outlen)) >>> 0;

  let msg: Uint8Array;
  if (key) {
    const kp = new Uint8Array(64); // key padded to full block
    kp.set(key);
    msg = cat(kp, data);
  } else {
    msg = data;
  }

  const v = new Uint32Array(16);
  const m = new Uint32Array(16);
  let off = 0;

  while (off < msg.length || msg.length === 0) {
    const block = msg.subarray(off, Math.min(off + 64, msg.length));
    const last = off + 64 >= msg.length;
    const t = off + block.length; // bytes processed INCLUDING this block
    v.set(h);
    for (let i = 0; i < 8; i++) v[i + 8] = IV[i];
    v[12] = IV[4] ^ (t >>> 0);
    v[13] = IV[5] ^ Math.floor(t / 0x100000000);
    if (last) { v[14] = ~v[14] >>> 0; }
    m.fill(0);
    for (let i = 0; i < block.length; i++) {
      m[i >>> 2] ^= block[i] << (i & 3) * 8;
    }
    for (let r = 0; r < 10; r++) {
      const s = r * 16;
      g(v, 0, 4, 8, 12, m[SIGMA[s]], m[SIGMA[s + 1]]);
      g(v, 1, 5, 9, 13, m[SIGMA[s + 2]], m[SIGMA[s + 3]]);
      g(v, 2, 6, 10, 14, m[SIGMA[s + 4]], m[SIGMA[s + 5]]);
      g(v, 3, 7, 11, 15, m[SIGMA[s + 6]], m[SIGMA[s + 7]]);
      g(v, 0, 5, 10, 15, m[SIGMA[s + 8]], m[SIGMA[s + 9]]);
      g(v, 1, 6, 11, 12, m[SIGMA[s + 10]], m[SIGMA[s + 11]]);
      g(v, 2, 7, 8, 13, m[SIGMA[s + 12]], m[SIGMA[s + 13]]);
      g(v, 3, 4, 9, 14, m[SIGMA[s + 14]], m[SIGMA[s + 15]]);
    }
    for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0;
    off += 64;
    if (msg.length === 0) break;
  }

  const out = new Uint8Array(outlen);
  for (let i = 0; i < outlen; i++) {
    out[i] = (h[i >>> 2] >>> ((i & 3) * 8)) & 0xff;
  }
  return out;
}

const cat = (...arrs: Uint8Array[]) => {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};

/** HMAC-BLAKE2s256 */
function hmac(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > 64) k = blake2s(k, undefined, 32);
  const pad = new Uint8Array(64);
  pad.set(k);
  const ip = new Uint8Array(64), op = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { ip[i] = pad[i] ^ 0x36; op[i] = pad[i] ^ 0x5c; }
  return blake2s(cat(op, blake2s(cat(ip, data), undefined, 32)), undefined, 32);
}

/** WireGuard KDFn: prk = HMAC(key=chainingKey, data=ikm), then expand. */
function kdf(ck: Uint8Array, ikm: Uint8Array, n: number): Uint8Array[] {
  const prk = hmac(ck, ikm);
  const out: Uint8Array[] = [];
  let t = new Uint8Array(0);
  for (let i = 1; i <= n; i++) {
    t = hmac(prk, cat(t, new Uint8Array([i])));
    out.push(t);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* x25519 + chacha20poly1305 via node crypto                          */
/* ------------------------------------------------------------------ */

const PKCS8 = Buffer.from("302e020100300506032b656e04220420", "hex");
const SPKI = Buffer.from("302a300506032b656e032100", "hex");

function privKeyObj(raw: Buffer) {
  return crypto.createPrivateKey({ key: Buffer.concat([PKCS8, raw]), format: "der", type: "pkcs8" });
}
function pubKeyObj(raw: Buffer) {
  return crypto.createPublicKey({ key: Buffer.concat([SPKI, raw]), format: "der", type: "spki" });
}
function dh(privRaw: Buffer, pubRaw: Buffer): Buffer {
  return crypto.diffieHellman({ privateKey: privKeyObj(privRaw), publicKey: pubKeyObj(pubRaw) });
}
function aeadSeal(key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Buffer {
  // Bun's node:crypto lacks chacha20-poly1305 — use the verified pure-JS AEAD.
  return Buffer.from(aeadSealJs(key, new Uint8Array(12), plaintext, aad));
}

/* ------------------------------------------------------------------ */
/* Handshake initiation                                               */
/* ------------------------------------------------------------------ */

const CONSTRUCTION = new TextEncoder().encode("Noise_IKpsk2_25519_ChaChaPoly_BLAKE2s");
const IDENTIFIER = new TextEncoder().encode("WireGuard v1 zx2c4 Jason@zx2c4.com");
const LABEL_MAC1 = new TextEncoder().encode("mac1----");

/** TAI64N timestamp, 12 bytes (canonical base 0x400000000000000a). */
function tai64n(): Uint8Array {
  const now = Date.now();
  const secs = BigInt(Math.floor(now / 1000)) + 0x400000000000000an;
  const nanos = (now % 1000) * 1e6;
  const b = new Uint8Array(12);
  const dv = new DataView(b.buffer);
  dv.setBigUint64(0, secs, false);
  dv.setUint32(8, nanos, false);
  return b;
}

export interface HandshakeKeys {
  /** base64 WireGuard private key */
  privateKey: string;
  /** base64 Cloudflare peer public key */
  peerPublicKey: string;
}

/** Build a 148-byte WireGuard handshake initiation packet (canonical wireguard-go order). */
export function buildHandshakeInitiation(keys: HandshakeKeys): Buffer {
  const initPriv = Buffer.from(keys.privateKey, "base64");
  const respPub = Buffer.from(keys.peerPublicKey, "base64");
  const initPubRaw = crypto.createPublicKey(privKeyObj(initPriv)).export({ type: "spki", format: "der" }) as Buffer;
  const initPub = initPubRaw.subarray(initPubRaw.length - 32);

  // ephemeral keypair
  const e = crypto.generateKeyPairSync("x25519");
  const ePrivDer = e.privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
  const ePriv = ePrivDer.subarray(ePrivDer.length - 32);
  const ePubDer = e.publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const ePub = ePubDer.subarray(ePubDer.length - 32);

  // noise chain — canonical order:
  // c = HASH(CONSTRUCTION); h = HASH(c || IDENTIFIER)
  let c = blake2s(CONSTRUCTION, undefined, 32);
  let h = blake2s(cat(c, IDENTIFIER), undefined, 32);
  h = blake2s(cat(h, respPub), undefined, 32);            // mixHash(remoteStatic)

  const [cAfterEpub] = kdf(c, ePub, 2);                    // mixKey(ePub)
  c = cAfterEpub;
  h = blake2s(cat(h, ePub), undefined, 32);                // mixHash(ePub)

  const [c1, k1] = kdf(c, dh(ePriv, respPub), 2);          // KDF2(c, DH(e,resp))
  c = c1;
  const encStatic = aeadSeal(k1, initPub, h);              // encrypt static
  h = blake2s(cat(h, encStatic), undefined, 32);           // mixHash(static)

  const [c2, k2] = kdf(c, dh(initPriv, respPub), 2);       // KDF2(c, DH(init,resp))
  const encTimestamp = aeadSeal(k2, tai64n(), h);          // encrypt timestamp
  h = blake2s(cat(h, encTimestamp), undefined, 32);        // mixHash(timestamp)

  // packet
  const pkt = Buffer.alloc(148);
  pkt[0] = 1; // type: initiation
  pkt.writeUInt32LE(Math.floor(Math.random() * 0xffffffff), 4); // sender index
  Buffer.from(ePub).copy(pkt, 8);
  Buffer.from(encStatic).copy(pkt, 40);
  Buffer.from(encTimestamp).copy(pkt, 88);

  const macKey = blake2s(cat(LABEL_MAC1, respPub), undefined, 32);
  const mac1 = blake2s(pkt.subarray(0, 116), macKey, 16);
  Buffer.from(mac1).copy(pkt, 116);
  // mac2 = 16 zero bytes (no cookie yet)
  return pkt;
}

export interface ProbeResult {
  alive: boolean;
  ms: number;
  error?: string;
}

/**
 * Fire a real handshake over UDP.
 * A type-2 reply (handshake response) or a type-3 reply (cookie challenge,
 * sent under load) both prove the endpoint is a live WireGuard responder.
 * Retries once with a fresh ephemeral when the first attempt times out.
 */
export function probeWarpEndpoint(
  ip: string,
  port: number,
  keys: HandshakeKeys,
  timeoutMs = 2200,
  attempts = 2
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let finished = false;
    let attempt = 0;
    let sock: dgram.Socket | null = null;
    const t0 = Date.now();

    const cleanup = () => {
      if (sock) {
        try { sock.close(); } catch { /* noop */ }
        sock = null;
      }
    };

    const finish = (alive: boolean, error?: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve({ alive, ms: Date.now() - t0, error });
    };

    const tryOnce = () => {
      if (finished) return;
      attempt += 1;

      let pkt: Buffer;
      try {
        pkt = buildHandshakeInitiation(keys);
      } catch (e) {
        finish(false, e instanceof Error ? e.message : "handshake build failed");
        return;
      }

      const s = dgram.createSocket("udp4");
      sock = s;

      s.on("message", (msg: Buffer) => {
        if (msg.length >= 4 && (msg[0] === 2 || msg[0] === 3)) {
          finish(true); // handshake response or cookie challenge = live responder
        } else {
          finish(false, "unexpected reply");
        }
      });
      s.on("error", (err: Error) => {
        s.removeAllListeners();
        if (attempt < attempts) setTimeout(tryOnce, 120);
        else finish(false, err.message);
      });

      s.send(pkt, port, ip, (err) => {
        if (err) {
          s.removeAllListeners();
          if (attempt < attempts) setTimeout(tryOnce, 120);
          else finish(false, err.message);
        }
      });

      setTimeout(() => {
        if (finished) return;
        try { s.close(); } catch { /* noop */ }
        if (attempt < attempts) {
          setTimeout(tryOnce, 120);
        } else {
          finish(false, "timeout");
        }
      }, timeoutMs);
    };

    tryOnce();
  });
}

/* ------------------------------------------------------------------ */
/* Self-test vectors                                                  */
/* ------------------------------------------------------------------ */

export function selfTest(): { blake2sEmpty: string; blake2sAbc: string } {
  const enc = new TextEncoder();
  const hex = (u: Uint8Array) => Buffer.from(u).toString("hex");
  return {
    blake2sEmpty: hex(blake2s(new Uint8Array(0), undefined, 32)),
    blake2sAbc: hex(blake2s(enc.encode("abc"), undefined, 32)),
  };
}
