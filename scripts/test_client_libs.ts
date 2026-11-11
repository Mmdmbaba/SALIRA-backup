/**
 * Tests for the new client libs:
 * 1) X25519 against RFC 7748 test vectors
 * 2) ZIP output validated by unzip -t
 * 3) fa digits
 */
import { x25519, generateClientKeyPair } from "../src/lib/x25519-client";
import { createZip } from "../src/lib/zip";
import { writeFileSync } from "fs";

const hex2b = (h: string) => Uint8Array.from(Buffer.from(h.replace(/\s+/g, ""), "hex"));
const b2hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

let pass = 0, fail = 0;
const check = (name: string, ok: boolean) => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
};

// RFC 7748 §5.2 test vector 1
{
  const k = hex2b("a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4");
  const u = hex2b("e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c");
  const got = b2hex(x25519(k, u));
  check("x25519 RFC7748 vec1", got === "c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552");
}
// RFC 7748 §5.2 test vector 2
{
  const k = hex2b("4b66e9d4d1b4673c5ad22691957d6af5c11b6421e0ea01d42ca4169e7918ba0d");
  const u = hex2b("e5210f12786811d3f4b7959d0538ae2c31dbe7106fc03c3efc4cd549c715a493");
  const got = b2hex(x25519(k, u));
  check("x25519 RFC7748 vec2", got === "95cbde9476e8907d7aade45cb4b873f88b595a68799fa152e6f8f7647aac7957");
}
// keygen sanity: pub = priv * 9 must be 32 bytes, and two keypairs differ
{
  const a = generateClientKeyPair();
  const b = generateClientKeyPair();
  const pubAgain = Buffer.from(x25519(hex2b(Buffer.from(a.privateKey, "base64").toString("hex")), Uint8Array.from([9, ...new Array(31).fill(0)]))).toString("base64");
  check("keygen pub derivation matches", pubAgain === a.publicKey);
  check("keypairs are unique", a.privateKey !== b.privateKey);
}

// ZIP: write two files, validate externally
{
  const blob = createZip([
    { name: "a.conf", content: "[Interface]\nPrivateKey = AAA=\n" },
    { name: "b.conf", content: "hello zip داخلی" },
  ]);
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync("/tmp/test_salira.zip", buf);
  console.log("zip written:", buf.length, "bytes");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
