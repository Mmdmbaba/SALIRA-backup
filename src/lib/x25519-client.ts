"use client";

/**
 * Browser-side X25519 (RFC 7748) via BigInt Montgomery ladder.
 * Lets the client generate its WireGuard keypair so the private key
 * never needs to leave the browser, even though registration is relayed.
 */

const P = (1n << 255n) - 19n;
const A24 = 121665n;

function cswap(swap: bigint, x2: bigint, x3: bigint): [bigint, bigint] {
  const mask = -swap & ((1n << 255n) - 1n);
  return [(x2 ^ x3) & mask ^ x2, (x2 ^ x3) & mask ^ x3];
}

function modp(v: bigint): bigint {
  const r = v % P;
  return r < 0n ? r + P : r;
}

/** Modular exponentiation (square-and-multiply). */
function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = modp(base);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

/** X25519 scalar multiplication. k = 32-byte scalar, u = 32-byte point (LE). */
export function x25519(kBytes: Uint8Array, uBytes: Uint8Array): Uint8Array {
  const le = (b: Uint8Array): bigint => {
    let x = 0n;
    for (let i = b.length - 1; i >= 0; i--) x = (x << 8n) | BigInt(b[i]);
    return x;
  };
  const toLE = (v: bigint): Uint8Array => {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      out[i] = Number(v & 0xffn);
      v >>= 8n;
    }
    return out;
  };

  // decode scalar + clamp (RFC 7748 decodeScalar)
  const kb = Uint8Array.from(kBytes);
  kb[0] &= 248;
  kb[31] &= 127;
  kb[31] |= 64;
  const k = le(kb);

  // decode u — X25519 masks only the top bit
  let u = le(uBytes) & ((1n << 255n) - 1n);
  u = modp(u);

  let x1 = u;
  let x2 = 1n, z2 = 0n;
  let x3 = u, z3 = 1n;
  let swap = 0n;

  for (let t = 254; t >= 0; t--) {
    const kt = (k >> BigInt(t)) & 1n;
    swap ^= kt;
    [x2, x3] = cswap(swap, x2, x3);
    [z2, z3] = cswap(swap, z2, z3);
    swap = kt;

    const A = modp(x2 + z2);
    const AA = modp(A * A);
    const B = modp(x2 - z2);
    const BB = modp(B * B);
    const E = modp(AA - BB);
    const C = modp(x3 + z3);
    const D = modp(x3 - z3);
    const DA = modp(D * A);
    const CB = modp(C * B);
    const t0 = modp(DA + CB);
    const t1 = modp(DA - CB);
    x3 = modp(t0 * t0);
    z3 = modp(x1 * modp(t1 * t1));
    x2 = modp(AA * BB);
    z2 = modp(E * modp(AA + modp(A24 * E)));
  }
  [x2, x3] = cswap(swap, x2, x3);
  [z2, z3] = cswap(swap, z2, z3);

  const zinv = modpow(z2, P - 2n, P);
  const out = modp(x2 * zinv);
  return toLE(out);
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export interface ClientKeyPair {
  privateKey: string; // base64
  publicKey: string; // base64
}

/** Generate a clamped WireGuard keypair in the browser. */
export function generateClientKeyPair(): ClientKeyPair {
  const priv = new Uint8Array(32);
  crypto.getRandomValues(priv);
  priv[0] &= 248;
  priv[31] &= 127;
  priv[31] |= 64;

  const basepoint = new Uint8Array(32);
  basepoint[0] = 9;

  const pub = x25519(priv, basepoint);
  return { privateKey: b64(priv), publicKey: b64(pub) };
}
