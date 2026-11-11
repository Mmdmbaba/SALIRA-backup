/**
 * Verification: blake2s vectors + real WG handshake probe against WARP endpoints.
 * Run: bun /home/z/my-project/scripts/test_wg_handshake.ts
 */
import { registerWarpDevice } from "../src/lib/warp-server";
import { selfTest, probeWarpEndpoint } from "../src/lib/wg-handshake";

async function main() {
  const st = selfTest();
  const okEmpty = st.blake2sEmpty === "69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9";
  const okAbc = st.blake2sAbc === "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982";
  console.log("blake2s(\"\") match:", okEmpty);
  console.log("blake2s(\"abc\") match:", okAbc);
  if (!okEmpty || !okAbc) {
    console.error("BLAKE2S VECTORS FAILED — aborting");
    process.exit(1);
  }

  console.log("\nRegistering a real WARP device…");
  const dev = await registerWarpDevice();
  console.log("peer pubkey:", dev.peerPublicKey.slice(0, 16) + "…");

  const targets: Array<[string, number]> = [
    ["162.159.192.1", 2408],
    ["162.159.193.10", 2408],
    ["188.114.96.1", 2408],
    ["188.114.97.1", 2408],
    ["198.41.192.7", 2408],
  ];
  console.log("\nReal WireGuard handshake probes:");
  for (const [ip, port] of targets) {
    const r = await probeWarpEndpoint(
      ip,
      port,
      { privateKey: dev.privateKey, peerPublicKey: dev.peerPublicKey },
      3000
    );
    console.log(`  ${ip}:${port} =>`, r.alive ? `ALIVE ${r.ms}ms` : `dead (${r.error}) after ${r.ms}ms`);
  }
}

main();
