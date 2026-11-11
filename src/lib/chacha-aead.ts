/**
 * Pure-JS ChaCha20-Poly1305 AEAD (RFC 8439).
 * Needed because Bun's crypto (BoringSSL) does not expose chacha20-poly1305,
 * and WireGuard handshakes require it.
 * Verified against RFC 8439 official test vectors in scripts/test_aead.ts.
 */

/* ---------------------------- ChaCha20 ---------------------------- */

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function chachaBlock(state: Uint32Array, out: Uint8Array, outOffset: number) {
  const x = new Uint32Array(16);
  x.set(state);
  const QR = (a: number, b: number, c: number, d: number) => {
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl(x[d] ^ x[a], 16);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl(x[b] ^ x[c], 12);
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rotl(x[d] ^ x[a], 8);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rotl(x[b] ^ x[c], 7);
  };
  for (let i = 0; i < 10; i++) {
    QR(0, 4, 8, 12); QR(1, 5, 9, 13); QR(2, 6, 10, 14); QR(3, 7, 11, 15);
    QR(0, 5, 10, 15); QR(1, 6, 11, 12); QR(2, 7, 8, 13); QR(3, 4, 9, 14);
  }
  for (let i = 0; i < 16; i++) {
    const v = (x[i] + state[i]) >>> 0;
    out[outOffset + i * 4] = v & 0xff;
    out[outOffset + i * 4 + 1] = (v >>> 8) & 0xff;
    out[outOffset + i * 4 + 2] = (v >>> 16) & 0xff;
    out[outOffset + i * 4 + 3] = (v >>> 24) & 0xff;
  }
}

function initState(key: Uint8Array, nonce: Uint8Array, counter: number): Uint32Array {
  const s = new Uint32Array(16);
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  for (let i = 0; i < 8; i++) {
    s[4 + i] = (key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24)) >>> 0;
  }
  s[12] = counter >>> 0;
  for (let i = 0; i < 3; i++) {
    s[13 + i] = (nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24)) >>> 0;
  }
  return s;
}

/** ChaCha20 keystream XOR (single or multi block). */
export function chacha20(key: Uint8Array, nonce: Uint8Array, counter: number, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  const tmp = new Uint8Array(64);
  let block = counter;
  for (let off = 0; off < data.length; off += 64, block++) {
    chachaBlock(initState(key, nonce, block), tmp, 0);
    const n = Math.min(64, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ tmp[i];
  }
  return out;
}

/* ---------------------------- Poly1305 ---------------------------- */

/**
 * Poly1305 MAC — exact BigInt implementation mod 2^130-5.
 * Workload here is tiny (handshake-sized messages), so BigInt is perfect.
 */
export function poly1305(msg: Uint8Array, key: Uint8Array): Uint8Array {
  const P = (1n << 130n) - 5n;
  const le = (bytes: Uint8Array): bigint => {
    let x = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) x = (x << 8n) | BigInt(bytes[i]);
    return x;
  };
  const r = le(key.subarray(0, 16)) & 0x0ffffffc0ffffffc0ffffffc0fffffffn;
  const s = le(key.subarray(16, 32));
  let h = 0n;
  for (let i = 0; i < msg.length; i += 16) {
    const chunk = msg.subarray(i, Math.min(i + 16, msg.length));
    const n = le(chunk) | (1n << BigInt(chunk.length * 8));
    h = ((h + n) * r) % P;
  }
  const tag = (h + s) & ((1n << 128n) - 1n);
  const out = new Uint8Array(16);
  let v = tag;
  for (let i = 0; i < 16; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/* ------------------------- AEAD construction ------------------------- */

function pad16(len: number): Uint8Array {
  return new Uint8Array((16 - (len % 16)) % 16);
}

const le64 = (n: number): Uint8Array => {
  const b = new Uint8Array(8);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b; // WG messages are far below 2^32, high words zero
};

/** AEAD_CHACHA20_POLY1305 seal. Nonce must be 12 bytes. */
export function aeadSealJs(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Uint8Array {
  const polyKey = chacha20(key, nonce, 0, new Uint8Array(32));
  const ciphertext = chacha20(key, nonce, 1, plaintext);
  const macData = new Uint8Array(
    aad.length + pad16(aad.length).length + ciphertext.length + pad16(ciphertext.length).length + 16
  );
  let o = 0;
  macData.set(aad, o); o += aad.length;
  o += pad16(aad.length).length;
  macData.set(ciphertext, o); o += ciphertext.length;
  o += pad16(ciphertext.length).length;
  macData.set(le64(aad.length), o); o += 8;
  macData.set(le64(ciphertext.length), o);
  const tag = poly1305(macData, polyKey);
  const out = new Uint8Array(ciphertext.length + 16);
  out.set(ciphertext);
  out.set(tag, ciphertext.length);
  return out;
}
