/**
 * SALIRA — AmneziaWG config engine v2 (shared client/server, pure logic)
 * Based on the AmneziaWG spec + the x4gpanell/Amnezia-Wg generator,
 * rebuilt as a typed, testable, updatable module.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface JunkParams {
  jc: number;
  jmin: number;
  jmax: number;
  s1: number;
  s2: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
}

export interface Amnezia15Params {
  i1?: string;
  i2?: string;
  i3?: string;
  i4?: string;
  i5?: string;
}

export interface WarpDevice {
  deviceId: string;
  accountId: string;
  accountType: string;
  license: string;
  createdAt: string;
  warpPlus: boolean;
  clientId: string;
  privateKey: string;
  addressV4: string;
  addressV6: string;
  peerPublicKey: string;
  preSharedKey?: string;
  endpointHost: string;
  endpointV6?: string;
  endpointPorts: number[];
  registerSource: string;
  /** WARP+ license attach result */
  licenseApplied?: boolean;
  /** where the keypair was generated: client browser or our server */
  keySource?: "client" | "server";
}

/** Everything the generator UI can tune. */
export interface BuildOptions {
  device: WarpDevice;
  endpoint: string;
  mtu: number | null; // null → omit MTU line
  junk: JunkParams;
  amnezia15: Amnezia15Params;
  /** plain WireGuard output: strip every J/S/H/I parameter */
  plainWireguard: boolean;
  dns: string[]; // empty → omit
  allowedIps: string;
  keepalive: number | null; // null → omit
  listenPort: number | null; // null → omit
  tableOff: boolean;
  preUp?: string;
  postUp?: string;
  preDown?: string;
  postDown?: string;
}

export type JunkPresetId = "light" | "heavy" | "random" | "custom";

/* ------------------------------------------------------------------ */
/* Defaults & presets                                                  */
/* ------------------------------------------------------------------ */

/** Known-good Warp I1 signature for AmneziaWG 1.5 (from the reference generator). */
export const WARP_I1_DEFAULT =
  "<b 0xc70000000108ce1bf31eec7d93360000449e227e4596ed7f75c4d35ce31880b4133107c822c6355b51f0d7c1bba96d5c210a48aca01885fed0871cfc37d59137d73b506dc013bb4a13c060ca5b04b7ae215af71e37d6e8ff1db235f9fe0c25cb8b492471054a7c8d0d6077d430d07f6e87a8699287f6e69f54263c7334a8e144a29851429bf2e350e519445172d36953e96085110ce1fb641e5efad42c0feb4711ece959b72cc4d6f3c1e83251adb572b921534f6ac4b10927167f41fe50040a75acef62f45bded67c0b45b9d655ce374589cad6f568b8475b2e8921ff98628f86ff2eb5bcce6f3ddb7dc89e37c5b5e78ddc8d93a58896e530b5f9f1448ab3b7a1d1f24a63bf981634f6183a21af310ffa52e9ddf5521561760288669de01a5f2f1a4f922e68d0592026bbe4329b654d4f5d6ace4f6a23b8560b720a5350691c0037b10acfac9726add44e7d3e880ee6f3b0d6429ff33655c297fee786bb5ac032e48d2062cd45e305e6d8d8b82bfbf0fdbc5ec09943d1ad02b0b5868ac4b24bb10255196be883562c35a713002014016b8cc5224768b3d330016cf8ed9300fe6bf39b4b19b3667cddc6e7c7ebe4437a58862606a2a66bd4184b09ab9d2cd3d3faed4d2ab71dd821422a9540c4c5fa2a9b2e6693d411a22854a8e541ed930796521f03a54254074bc4c5bca152a1723260e7d70a24d49720acc544b41359cfc252385bda7de7d05878ac0ea0343c77715e145160e6562161dfe2024846dfda3ce99068817a2418e66e4f37dea40a21251c8a034f83145071d93baadf050ca0f95dc9ce2338fb082d64fbc8faba905cec66e65c0e1f9b003c32c943381282d4ab09bef9b6813ff3ff5118623d2617867e25f0601df583c3ac51bc6303f79e68d8f8de4b8363ec9c7728b3ec5fcd5274edfca2a42f2727aa223c557afb33f5bea4f64aeb252c0150ed734d4d8eccb257824e8e090f65029a3a042a51e5cc8767408ae07d55da8507e4d009ae72c47ddb138df3cab6cc023df2532f88fb5a4c4bd917fafde0f3134be09231c389c70bc55cb95a779615e8e0a76a2b4d943aabfde0e394c985c0cb0376930f92c5b6998ef49ff4a13652b787503f55c4e3d8eebd6e1bc6db3a6d405d8405bd7a8db7cefc64d16e0d105a468f3d33d29e5744a24c4ac43ce0eb1bf6b559aed520b91108cda2de6e2c4f14bc4f4dc58712580e07d217c8cca1aaf7ac04bab3e7b1008b966f1ed4fba3fd93a0a9d3a27127e7aa587fbcc60d548300146bdc126982a58ff5342fc41a43f83a3d2722a26645bc961894e339b953e78ab395ff2fb854247ad06d446cc2944a1aefb90573115dc198f5c1efbc22bc6d7a74e41e666a643d5f85f57fde81b87ceff95353d22ae8bab11684180dd142642894d8dc34e402f802c2fd4a73508ca99124e428d67437c871dd96e506ffc39c0fc401f666b437adca41fd563cbcfd0fa22fbbf8112979c4e677fb533d981745cceed0fe96da6cc0593c430bbb71bcbf924f70b4547b0bb4d41c94a09a9ef1147935a5c75bb2f721fbd24ea6a9f5c9331187490ffa6d4e34e6bb30c2c54a0344724f01088fb2751a486f425362741664efb287bce66c4a544c96fa8b124d3c6b9eaca170c0b530799a6e878a57f402eb0016cf2689d55c76b2a91285e2273763f3afc5bc9398273f5338a06d>";

export const JUNK_PRESETS: Record<
  Exclude<JunkPresetId, "random" | "custom">,
  { jc: number; jmin: number; jmax: number }
> = {
  light: { jc: 3, jmin: 1, jmax: 3 },
  heavy: { jc: 5, jmin: 10, jmax: 40 },
};

export const DEFAULT_JUNK: JunkParams = {
  jc: 3,
  jmin: 1,
  jmax: 3,
  s1: 0,
  s2: 0,
  h1: 11,
  h2: 22,
  h3: 33,
  h4: 44,
};

export const DEFAULT_MTU = 1280;

/* ------------------------- endpoints ------------------------- */

/** Curated Cloudflare ranges known to host Warp endpoints. */
export const CLEAN_IP_PREFIXES = [
  "162.159.192.",
  "162.159.193.",
  "162.159.195.",
  "188.114.96.",
  "188.114.97.",
  "188.114.98.",
  "188.114.99.",
];

/** The official 55 Warp UDP ports returned by the registration API. */
export const WARP_PORTS = [
  500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942,
  943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180,
  1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233,
  4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886,
];

export const DEFAULT_PORT = 2408;

/** Handy selectable endpoints for the picker. */
export interface EndpointPreset {
  label: string;
  value: string;
  note?: string;
}

export const ENDPOINT_PRESETS: EndpointPreset[] = [
  { label: "engage.cloudflareclient.com", value: "engage.cloudflareclient.com:2408", note: "official hostname" },
  { label: "162.159.192.1", value: "162.159.192.1:2408", note: "range 162.159.192.0/24" },
  { label: "162.159.193.10", value: "162.159.193.10:2408", note: "range 162.159.193.0/24" },
  { label: "162.159.195.1", value: "162.159.195.1:2408", note: "range 162.159.195.0/24" },
  { label: "188.114.96.1", value: "188.114.96.1:2408", note: "range 188.114.96.0/24" },
  { label: "188.114.97.1", value: "188.114.97.1:2408", note: "range 188.114.97.0/24" },
  { label: "188.114.98.224", value: "188.114.98.224:2408", note: "range 188.114.98.0/24" },
  { label: "188.114.99.224", value: "188.114.99.224:2408", note: "range 188.114.99.0/24" },
];

export interface ScanRange {
  id: string;
  cidr: string;
  base: string; // "162.159.192."
  from: number;
  to: number;
}

/** Ranges the scanner can sample from. */
export const SCAN_RANGES: ScanRange[] = [
  { id: "r192", cidr: "162.159.192.0/24", base: "162.159.192.", from: 1, to: 254 },
  { id: "r193", cidr: "162.159.193.0/24", base: "162.159.193.", from: 1, to: 254 },
  { id: "r195", cidr: "162.159.195.0/24", base: "162.159.195.", from: 1, to: 254 },
  { id: "r96", cidr: "188.114.96.0/24", base: "188.114.96.", from: 1, to: 254 },
  { id: "r97", cidr: "188.114.97.0/24", base: "188.114.97.", from: 1, to: 254 },
  { id: "r98", cidr: "188.114.98.0/24", base: "188.114.98.", from: 1, to: 254 },
  { id: "r99", cidr: "188.114.99.0/24", base: "188.114.99.", from: 1, to: 254 },
];

/* ------------------------- validation ------------------------- */

export interface Violations {
  [field: string]: string | undefined;
}

/** Live-validate the generator inputs. Keys are i18n message keys or raw fa messages. */
export function validateGen(opts: {
  junk: JunkParams;
  mtu: number | null;
  listenPort: number | null;
  endpoint: string;
}): Violations {
  const v: Violations = {};
  const { junk, mtu, listenPort, endpoint } = opts;

  if (junk.jc < 1 || junk.jc > 128) v.jc = "val_jc";
  if (junk.jmin < 1 || junk.jmin > 1279) v.jmin = "val_jmin";
  if (junk.jmax > 1280) v.jmax = "val_jmax";
  if (junk.jmin >= junk.jmax) v.jmax = "val_jmin_jmax";

  if (junk.s1 < 0 || junk.s1 > 65535) v.s1 = "val_s";
  if (junk.s2 < 0 || junk.s2 > 65535) v.s2 = "val_s";
  if (junk.s1 + 56 === junk.s2) v.s2 = "val_s1_s2";

  const hs = [junk.h1, junk.h2, junk.h3, junk.h4];
  hs.forEach((h, i) => {
    if (h <= 4 || h > 2147483647) v[`h${i + 1}`] = "val_h";
  });
  if (new Set(hs).size !== 4) v.h = "val_h_unique";

  if (mtu !== null && (mtu < 576 || mtu > 1500)) v.mtu = "val_mtu";
  if (listenPort !== null && (listenPort < 1 || listenPort > 65535)) v.listen = "val_listen";

  const ep = endpoint.trim();
  const v4re = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d):\d{1,5}$/;
  const v6re = /^\[[0-9a-fA-F:]+\]:\d{1,5}$/;
  const hostRe = /^[a-zA-Z0-9.-]+:\d{1,5}$/;
  if (ep && !v4re.test(ep) && !v6re.test(ep) && !hostRe.test(ep)) v.endpoint = "val_endpoint";

  return v;
}

/* ------------------------- misc helpers ------------------------- */

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random junk generator, mirrors the reference tool's behaviour. */
export function randomJunk(): Pick<JunkParams, "jc" | "jmin" | "jmax"> {
  const jc = randInt(1, 128);
  const jmin = randInt(1, 1279);
  const jmax = randInt(jmin + 1, 1280);
  return { jc, jmin, jmax };
}

/** Random valid H1..H4 (distinct, 4..2147483647) per AWG spec. */
export function randomHosts(): Pick<JunkParams, "h1" | "h2" | "h3" | "h4"> {
  const set = new Set<number>();
  while (set.size < 4) set.add(randInt(4, 2147483647));
  const [h1, h2, h3, h4] = [...set];
  return { h1, h2, h3, h4 };
}

/** Pick a random clean endpoint: CF ip from curated ranges + a common port. */
export function randomCleanEndpoint(): string {
  const ip =
    CLEAN_IP_PREFIXES[Math.floor(Math.random() * CLEAN_IP_PREFIXES.length)] +
    Math.floor(Math.random() * 254 + 1);
  const port = WARP_PORTS[Math.floor(Math.random() * WARP_PORTS.length)];
  return `${ip}:${port}`;
}

/** Decode the WARP client_id into the `reserved` bytes (hex) used by sing-box/wg clients. */
export function reservedFromClientId(clientId: string): string {
  try {
    const buf = Buffer.from(clientId, "base64");
    return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Config builder                                                      */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Normalise the junk params into spec-valid ranges. */
export function resolveJunk(preset: JunkParams): JunkParams {
  const h = [preset.h1, preset.h2, preset.h3, preset.h4].map((x) =>
    clamp(x || 0, 5, 2147483647)
  );
  // ensure distinct H values (spec: unique, > 4)
  const seen = new Set<number>();
  const uniqueH = h.map((x) => {
    let v = x;
    while (seen.has(v) || v <= 4) v = Math.max(5, (v + 7) % 2147483647);
    seen.add(v);
    return v;
  });
  return {
    jc: clamp(preset.jc || 3, 1, 128),
    jmin: clamp(preset.jmin || 1, 1, 1279),
    jmax: clamp(preset.jmax || 3, clamp(preset.jmin || 1, 1, 1279) + 1, 1280),
    s1: clamp(preset.s1 || 0, 0, 65535),
    s2: clamp(preset.s2 || 0, 0, 65535),
    h1: uniqueH[0],
    h2: uniqueH[1],
    h3: uniqueH[2],
    h4: uniqueH[3],
  };
}

/** Build a complete, ready-to-import AmneziaWG `.conf` file. */
export function buildAwgConfig(opts: BuildOptions): string {
  const { device, endpoint, plainWireguard } = opts;

  const lines: string[] = [
    `# SALIRA AmneziaWG Config — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "[Interface]",
    `PrivateKey = ${device.privateKey}`,
    `Address = ${device.addressV4}, ${device.addressV6}`,
  ];

  if (opts.dns.length > 0) lines.push(`DNS = ${opts.dns.join(", ")}`);
  if (opts.mtu !== null) lines.push(`MTU = ${opts.mtu || DEFAULT_MTU}`);

  if (!plainWireguard) {
    const junk = resolveJunk(opts.junk);
    lines.push(
      `Jc = ${junk.jc}`,
      `Jmin = ${junk.jmin}`,
      `Jmax = ${junk.jmax}`,
      `S1 = ${junk.s1}`,
      `S2 = ${junk.s2}`,
      `H1 = ${junk.h1}`,
      `H2 = ${junk.h2}`,
      `H3 = ${junk.h3}`,
      `H4 = ${junk.h4}`
    );
    const a15 = opts.amnezia15;
    if (a15.i1) lines.push(`I1 = ${a15.i1}`);
    if (a15.i2) lines.push(`I2 = ${a15.i2}`);
    if (a15.i3) lines.push(`I3 = ${a15.i3}`);
    if (a15.i4) lines.push(`I4 = ${a15.i4}`);
    if (a15.i5) lines.push(`I5 = ${a15.i5}`);
  }

  if (opts.listenPort) lines.push(`ListenPort = ${opts.listenPort}`);
  if (opts.tableOff) lines.push(`Table = off`);
  if (opts.preUp) lines.push(`PreUp = ${opts.preUp}`);
  if (opts.preDown) lines.push(`PreDown = ${opts.preDown}`);
  if (opts.postUp) lines.push(`PostUp = ${opts.postUp}`);
  if (opts.postDown) lines.push(`PostDown = ${opts.postDown}`);

  lines.push("", "[Peer]", `PublicKey = ${device.peerPublicKey}`);

  if (device.preSharedKey) lines.push(`PresharedKey = ${device.preSharedKey}`);

  lines.push(
    `AllowedIPs = ${opts.allowedIps || "0.0.0.0/0, ::/0"}`,
    `Endpoint = ${endpoint || device.endpointHost}`
  );

  if (opts.keepalive !== null) lines.push(`PersistentKeepalive = ${opts.keepalive}`);

  return lines.join("\n") + "\n";
}

/** Derive a friendly filename like SALIRA_AWG_2026-10-25_14-32.conf */
export function awgFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `SALIRA_AWG_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.conf`;
}

/* ------------------------------------------------------------------ */
/* Client-side WARP registration parser                                */
/* ------------------------------------------------------------------ */

interface RawWarpReg {
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

/** Parse the raw WARP API registration payload into a WarpDevice. */
export function parseWarpReg(
  data: RawWarpReg,
  privateKey: string,
  keySource: "client" | "server",
  licenseApplied = false
): WarpDevice {
  const peer = data.config.peers[0];
  return {
    deviceId: data.id,
    accountId: data.account.id,
    accountType: data.account.account_type,
    license: data.account.license,
    createdAt: data.account.created,
    warpPlus: Boolean(data.account.warp_plus) || licenseApplied,
    clientId: data.config.client_id,
    privateKey,
    addressV4: data.config.interface.addresses.v4,
    addressV6: data.config.interface.addresses.v6,
    peerPublicKey: peer.public_key,
    preSharedKey: peer.pre_shared_key,
    endpointHost: peer.endpoint.host || "engage.cloudflareclient.com:2408",
    endpointV6: peer.endpoint.v6 || "",
    endpointPorts: peer.endpoint.ports || [2408],
    registerSource: "cloudflare-direct",
    licenseApplied,
    keySource,
  };
}
