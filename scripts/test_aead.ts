/**
 * RFC 8439 test vectors for the pure-JS chacha20 + poly1305 + AEAD.
 */
import { chacha20, poly1305, aeadSealJs } from "../src/lib/chacha-aead";

const hex2b = (h: string) => Uint8Array.from(Buffer.from(h.replace(/\s+/g, ""), "hex"));

let pass = 0, fail = 0;
const check = (name: string, got: string, want: string) => {
  const ok = got === want;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) { console.log("  got: ", got); console.log("  want:", want); }
};

// --- ChaCha20 block vector (RFC 8439 §2.3.2) ---
const key = hex2b("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
const nonce = hex2b("000000090000004a00000000");
const block = chacha20(key, nonce, 1, new Uint8Array(64));
check(
  "chacha20 block §2.3.2",
  Buffer.from(block).toString("hex"),
  "10f1e7e4d13b5915500fdd1fa32071c4c7d1f4c733c068030422aa9ac3d46c4ed2826446079faa0914c2d705d98b02a2b5129cd1de164eb9cbd083e8a2503c4e"
);

// --- Poly1305 vector (RFC 8439 §2.5.2) ---
const pKey = hex2b("85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b");
const pMsg = new TextEncoder().encode("Cryptographic Forum Research Group");
check("poly1305 §2.5.2", Buffer.from(poly1305(pMsg, pKey)).toString("hex"), "a8061dc1305136c6c22b8baf0c0127a9");

// --- AEAD vector (RFC 8439 §2.8.2) ---
const aKey = hex2b("808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f");
const aNonce = hex2b("070000004041424344454647");
const aad = hex2b("50515253c0c1c2c3c4c5c6c7");
const plaintext = new TextEncoder().encode(
  "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
);
const sealed = aeadSealJs(aKey, aNonce, plaintext, aad);
const sealedHex = Buffer.from(sealed).toString("hex");
const wantCt =
  "d31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d6" +
  "3dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b36" +
  "92ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc" +
  "3ff4def08e4b7a9de576d26586cec64b6116";
check("aead ciphertext §2.8.2", sealedHex.slice(0, wantCt.length), wantCt);
check("aead tag §2.8.2", sealedHex.slice(wantCt.length), "1ae10b594f09e26a7e902ecbd0600691");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
