"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shuffle,
  Download,
  Copy,
  Loader2,
  KeyRound,
  SlidersHorizontal,
  Dices,
  QrCode,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Radar,
  Globe2,
  ListChecks,
  PenLine,
  Sparkles,
  Eraser,
  Save,
  Trash2,
  AlertTriangle,
  FileArchive,
  ShieldCheck,
  RefreshCcw,
} from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { num } from "@/lib/fa";
import { useAppView } from "@/lib/view-store";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_JUNK,
  DEFAULT_MTU,
  DEFAULT_PORT,
  ENDPOINT_PRESETS,
  JUNK_PRESETS,
  WARP_I1_DEFAULT,
  WARP_PORTS,
  awgFileName,
  buildAwgConfig,
  parseWarpReg,
  randomCleanEndpoint,
  randomHosts,
  randomJunk,
  reservedFromClientId,
  validateGen,
  type Amnezia15Params,
  type JunkParams,
  type JunkPresetId,
  type Violations,
  type WarpDevice,
} from "@/lib/awg";
import { generateClientKeyPair } from "@/lib/x25519-client";
import { createZip } from "@/lib/zip";
import { useScannerBridge } from "@/lib/scan-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldKey = keyof Pick<JunkParams, "jc" | "jmin" | "jmax" | "s1" | "s2" | "h1" | "h2" | "h3" | "h4">;
type EndpointMode = "auto" | "list" | "scan" | "manual";
type DnsPreset = "cf" | "google" | "adguard" | "none" | "custom";
type AllowedPreset = "all" | "v4" | "v6" | "custom";
type ErrorCode = "rate_limited" | "network" | "timeout" | "upstream" | "bad_key" | null;

const JUNK_FIELDS: FieldKey[] = ["jc", "jmin", "jmax", "s1", "s2", "h1", "h2", "h3", "h4"];
const I_FIELDS = ["i1", "i2", "i3", "i4", "i5"] as const;
type IKey = (typeof I_FIELDS)[number];

const DNS_PRESETS: Record<Exclude<DnsPreset, "custom">, string[]> = {
  cf: ["1.1.1.1", "1.0.0.1"],
  google: ["8.8.8.8", "8.8.4.4"],
  adguard: ["94.140.14.14", "94.140.15.15"],
  none: [],
};

const GEN_STORE_KEY = "salira-gen";

function readConfigsCount(): number {
  try {
    const raw = localStorage.getItem("salira-stats");
    return raw ? (JSON.parse(raw).configs ?? 0) : 0;
  } catch {
    return 0;
  }
}

function bumpConfigs(n: number) {
  try {
    localStorage.setItem("salira-stats", JSON.stringify({ configs: readConfigsCount() + n }));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event("salira-configs"));
  } catch {
    /* ignore */
  }
}

/* ---------------- tab panel header ---------------- */
function TabCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lux-card rounded-2xl p-5">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-gold/6 text-gold">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] text-ink/45">{desc}</p>
        </div>
      </header>
      <div className="mt-4 border-t border-line-soft pt-4">{children}</div>
    </section>
  );
}

/* ---------------- pill selector ---------------- */
function Pills<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full border px-3.5 py-1.5 text-[12px] transition-all duration-300 ${
            value === o.id
              ? "border-line-hi bg-gold/12 text-goldsoft"
              : "border-ink/10 text-ink/60 hover:border-line-strong hover:text-ink/85"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- inline validation error ---------------- */
function VErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-bad" role="alert">
      <AlertTriangle size={11} />
      {msg}
    </p>
  );
}

/* ---------------- conf syntax highlight ---------------- */
function ConfView({ conf }: { conf: string }) {
  const lines = useMemo(() => conf.split("\n"), [conf]);
  return (
    <div className="conf-code max-h-[560px] min-h-[420px] overflow-auto whitespace-pre-wrap break-all p-5">
      {lines.map((line, i) => {
        if (line.startsWith("#")) {
          return (
            <div key={i} className="conf-hl-comment">
              {line}
            </div>
          );
        }
        const sec = line.match(/^\[(.+)\]$/);
        if (sec) {
          return (
            <div key={i} className="conf-hl-section">
              [{sec[1]}]
            </div>
          );
        }
        const kv = line.match(/^([A-Za-z0-9_]+)(\s*=\s*)(.*)$/);
        if (kv) {
          return (
            <div key={i}>
              <span className="conf-hl-key">{kv[1]}</span>
              <span className="conf-hl-eq">{kv[2]}</span>
              <span className="conf-hl-value">{kv[3]}</span>
            </div>
          );
        }
        return (
          <div key={i} className="conf-hl-value">
            {line || "\u00A0"}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- persisted settings ---------------- */
interface GenPrefs {
  endpointMode: EndpointMode;
  manualEndpoint: string;
  listIp: string;
  listPort: number;
  mtuMode: "preset" | "auto" | "custom";
  mtuValue: string;
  dnsPreset: DnsPreset;
  dnsCustom: string;
  allowedPreset: AllowedPreset;
  allowedCustom: string;
  keepalive: number;
  tableOff: boolean;
  plainWg: boolean;
  junkPreset: JunkPresetId;
  junk: JunkParams;
  awg15: boolean;
}

function loadPrefs(): Partial<GenPrefs> | null {
  try {
    const raw = localStorage.getItem(GEN_STORE_KEY);
    return raw ? (JSON.parse(raw) as Partial<GenPrefs>) : null;
  } catch {
    return null;
  }
}

export function AwgGenerator() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const { toast } = useToast();
  const scanBest = useScannerBridge((s) => s.best);
  const bridgeResults = useScannerBridge((s) => s.results);
  const navigate = useAppView((s) => s.navigate);

  /* ------------------------------ state ------------------------------ */
  const [tab, setTab] = useState(0);
  const [scanPick, setScanPick] = useState<string | null>(null);
  const saved = useRef<Partial<GenPrefs> | null>(loadPrefs());
  const [endpointMode, setEndpointMode] = useState<EndpointMode>(saved.current?.endpointMode ?? "auto");
  const [manualEndpoint, setManualEndpoint] = useState(saved.current?.manualEndpoint ?? "");
  const [listIp, setListIp] = useState(saved.current?.listIp ?? ENDPOINT_PRESETS[1].value);
  const [listPort, setListPort] = useState<number>(saved.current?.listPort ?? DEFAULT_PORT);
  const [useV6Endpoint, setUseV6Endpoint] = useState(false);
  const [endpoint, setEndpoint] = useState(`engage.cloudflareclient.com:${DEFAULT_PORT}`);

  const [mtuMode, setMtuMode] = useState<"preset" | "auto" | "custom">(saved.current?.mtuMode ?? "preset");
  const [mtuValue, setMtuValue] = useState(saved.current?.mtuValue ?? String(DEFAULT_MTU));
  const [dnsPreset, setDnsPreset] = useState<DnsPreset>(saved.current?.dnsPreset ?? "cf");
  const [dnsCustom, setDnsCustom] = useState(saved.current?.dnsCustom ?? "");
  const [allowedPreset, setAllowedPreset] = useState<AllowedPreset>(saved.current?.allowedPreset ?? "all");
  const [allowedCustom, setAllowedCustom] = useState(saved.current?.allowedCustom ?? "");
  const [keepalive, setKeepalive] = useState<number>(saved.current?.keepalive ?? 25);
  const [listenPort, setListenPort] = useState("");
  const [tableOff, setTableOff] = useState(saved.current?.tableOff ?? false);

  const [plainWg, setPlainWg] = useState(saved.current?.plainWg ?? false);
  const [junkPreset, setJunkPreset] = useState<JunkPresetId>(saved.current?.junkPreset ?? "light");
  const [junk, setJunk] = useState<JunkParams>(saved.current?.junk ?? { ...DEFAULT_JUNK });
  const [awg15, setAwg15] = useState(saved.current?.awg15 ?? true);
  const [iVals, setIVals] = useState<Record<IKey, string>>({ i1: "", i2: "", i3: "", i4: "", i5: "" });

  const [multiCount, setMultiCount] = useState(1);
  const [license, setLicense] = useState("");
  const [hooksState, setHooksState] = useState({ preUp: "", postUp: "", preDown: "", postDown: "" });

  const [devices, setDevices] = useState<WarpDevice[]>([]);
  const [conf, setConf] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [errCode, setErrCode] = useState<ErrorCode>(null);
  const [errText, setErrText] = useState("");
  const [licenseState, setLicenseState] = useState<"none" | "ok" | "failed" | "bad">("none");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState("");

  /* scanner → generator bridge */
  useEffect(() => {
    if (scanBest) {
      setEndpointMode("scan");
      setScanPick(null);
      setEndpoint(scanBest.endpoint);
    }
  }, [scanBest?.endpoint]);

  /* ---------------------------- endpoint ---------------------------- */
  const deviceV6 = devices[0]?.endpointV6 || "";
  useEffect(() => {
    if (endpointMode === "auto") setEndpoint(`engage.cloudflareclient.com:${DEFAULT_PORT}`);
    else if (endpointMode === "list") {
      if (useV6Endpoint && deviceV6) setEndpoint(`[${deviceV6}]:${listPort}`);
      else setEndpoint(listIp.replace(/:\d+$/, "") + ":" + listPort);
    } else if (endpointMode === "manual") setEndpoint(manualEndpoint);
    else if (endpointMode === "scan" && scanBest) setEndpoint(scanBest.endpoint);
  }, [endpointMode, listIp, listPort, manualEndpoint, scanBest?.endpoint, useV6Endpoint, deviceV6]);

  /* ---------------------------- build opts ---------------------------- */
  const dnsList = useMemo(() => {
    if (dnsPreset === "custom") return dnsCustom.split(",").map((s) => s.trim()).filter(Boolean);
    return DNS_PRESETS[dnsPreset];
  }, [dnsPreset, dnsCustom]);

  const allowedIps = useMemo(() => {
    if (allowedPreset === "all") return "0.0.0.0/0, ::/0";
    if (allowedPreset === "v4") return "0.0.0.0/0";
    if (allowedPreset === "v6") return "::/0";
    return allowedCustom.trim() || "0.0.0.0/0, ::/0";
  }, [allowedPreset, allowedCustom]);

  const mtu: number | null = mtuMode === "auto" ? null : parseInt(mtuValue) || DEFAULT_MTU;
  const listenPortNum: number | null = listenPort ? parseInt(listenPort) : null;

  /* live validation */
  const violations: Violations = useMemo(
    () =>
      validateGen({
        junk,
        mtu,
        listenPort: listenPortNum,
        endpoint: endpoint.trim(),
      }),
    [junk, mtu, listenPortNum, endpoint]
  );
  const violationCount = Object.keys(violations).length;
  const msgOf = (key: string): string | undefined => {
    const v = violations[key];
    return v ? (tr as unknown as Record<string, string>)[v] ?? v : undefined;
  };

  /* wizard: which validation keys belong to which tab */
  const TAB_VIOLATION_KEYS: string[][] = [
    ["endpoint"],
    ["mtu", "listen"],
    ["jc", "jmin", "jmax", "s1", "s2", "h1", "h2", "h3", "h4", "h"],
    [],
    [],
  ];
  const tabBad = TAB_VIOLATION_KEYS.map((keys) => keys.filter((k) => violations[k]).length);
  const tabLabels = [tr.gtab_endpoint, tr.gtab_conn, tr.gtab_dpi, tr.gtab_adv, tr.gtab_build];
  const tabIcons = [
    <Globe2 size={16} key="i0" />,
    <SlidersHorizontal size={16} key="i1" />,
    <Sparkles size={16} key="i2" />,
    <PenLine size={16} key="i3" />,
    <KeyRound size={16} key="i4" />,
  ];
  const dirSign = lang === "fa" ? -1 : 1;

  const buildConf = useCallback(
    (dev: WarpDevice, ep?: string) =>
      buildAwgConfig({
        device: dev,
        endpoint: (ep ?? endpoint).trim(),
        mtu,
        junk,
        amnezia15: {
          i1: awg15 ? iVals.i1.trim() || WARP_I1_DEFAULT : undefined,
          i2: awg15 ? iVals.i2.trim() || undefined : undefined,
          i3: awg15 ? iVals.i3.trim() || undefined : undefined,
          i4: awg15 ? iVals.i4.trim() || undefined : undefined,
          i5: awg15 ? iVals.i5.trim() || undefined : undefined,
        } satisfies Amnezia15Params,
        plainWireguard: plainWg,
        dns: dnsList,
        allowedIps,
        keepalive,
        listenPort: listenPortNum,
        tableOff,
        preUp: hooksState.preUp.trim() || undefined,
        postUp: hooksState.postUp.trim() || undefined,
        preDown: hooksState.preDown.trim() || undefined,
        postDown: hooksState.postDown.trim() || undefined,
      }),
    [endpoint, mtu, junk, awg15, iVals, plainWg, dnsList, allowedIps, keepalive, listenPortNum, tableOff, hooksState]
  );

  /* live rebuild whenever anything changes and an account exists */
  useEffect(() => {
    if (devices[0]) setConf(buildConf(devices[0]));
  }, [devices, buildConf]);

  /* ----------------------------- actions ----------------------------- */
  const fetchDevice = async (attempt = 0): Promise<WarpDevice> => {
    let kp: { privateKey: string; publicKey: string } | null = null;
    try {
      kp = generateClientKeyPair();
    } catch {
      kp = null;
    }

    const doFetch = () =>
      fetch("/api/warp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(kp ? { publicKey: kp.publicKey } : {}),
          ...(license.trim() ? { license: license.trim() } : {}),
        }),
      });

    let res: Response;
    try {
      res = await doFetch();
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        return fetchDevice(attempt + 1);
      }
      throw { code: "network" } as { code: ErrorCode };
    }

    if (res.status === 429) throw { code: "rate_limited" } as { code: ErrorCode };

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      device?: WarpDevice;
      code?: ErrorCode;
    };

    if (!res.ok || !data.ok || !data.device) {
      const code: ErrorCode = data.code ?? (res.status >= 500 ? "upstream" : "timeout");
      if ((code === "upstream" || code === "timeout" || code === "network") && attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        return fetchDevice(attempt + 1);
      }
      throw { code } as { code: ErrorCode };
    }

    if (kp) {
      // merge the client-side private key — the server never saw it
      return { ...data.device, privateKey: kp.privateKey, keySource: "client" };
    }
    return { ...data.device, keySource: "server" };
  };

  const generate = useCallback(async () => {
    if (violationCount > 0) return;
    setLoading(true);
    setErrCode(null);
    setErrText("");
    setLicenseState("none");
    setDevices([]);
    setConf("");

    const n = Math.max(1, Math.min(5, multiCount));
    const collected: WarpDevice[] = [];

    try {
      for (let i = 0; i < n; i++) {
        if (n > 1) setProgress(`${num(i + 1, lang)} / ${num(n, lang)}`);
        const dev = await fetchDevice();
        // first device keeps the chosen endpoint; the rest get random healthy endpoints
        collected.push(dev);
        setDevices([...collected]);
        setConf(buildConf(collected[0]));
      }

      if (license.trim() && collected[0]?.licenseApplied) setLicenseState("ok");
      else if (license.trim() && !collected[0]?.licenseApplied) {
        setLicenseState(/^[A-Za-z0-9-]{6,}$/.test(license.trim()) ? "failed" : "bad");
      }
      bumpConfigs(collected.length);
      toast({ title: tr.success_msg });
    } catch (e) {
      const code = ((e as { code?: ErrorCode })?.code ?? "upstream") as Exclude<ErrorCode, null>;
      setErrCode(code);
      const map: Record<string, string> = {
        rate_limited: tr.err_rate,
        network: tr.err_network,
        timeout: tr.err_timeout,
        upstream: tr.err_upstream,
        bad_key: tr.err_badkey,
      };
      setErrText(map[code] ?? tr.err_upstream);
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [violationCount, multiCount, license, lang, fetchDevice, buildConf, toast, tr]);

  const downloadSingle = () => {
    if (!conf) return;
    const blob = new Blob([conf], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = awgFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = () => {
    if (devices.length === 0) return;
    const files = devices.map((dev, i) => ({
      name: i === 0 ? awgFileName() : awgFileName().replace(".conf", `_${i + 1}.conf`),
      content: buildConf(dev, i === 0 ? endpoint : randomCleanEndpoint()),
    }));
    const blob = createZip(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SALIRA_configs_${devices.length}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!conf) return;
    await navigator.clipboard.writeText(conf);
    toast({ title: tr.copied });
  };

  const showQr = async () => {
    if (!conf) return;
    try {
      const QR = await import("qrcode");
      const url = await QR.toDataURL(conf, {
        errorCorrectionLevel: "L",
        margin: 2,
        width: 520,
        color: { dark: "#0d1126", light: "#f2f4ff" },
      });
      setQrData(url);
      setQrOpen(true);
    } catch {
      toast({ title: tr.err_upstream, variant: "destructive" });
    }
  };

  const applyJunkPreset = (id: JunkPresetId) => {
    setJunkPreset(id);
    if (id === "light") setJunk((j) => ({ ...j, ...JUNK_PRESETS.light }));
    if (id === "heavy") setJunk((j) => ({ ...j, ...JUNK_PRESETS.heavy }));
    if (id === "random") setJunk((j) => ({ ...j, ...randomJunk(), ...randomHosts() }));
  };

  const savePrefs = () => {
    try {
      const prefs: GenPrefs = {
        endpointMode,
        manualEndpoint,
        listIp,
        listPort,
        mtuMode,
        mtuValue,
        dnsPreset,
        dnsCustom,
        allowedPreset,
        allowedCustom,
        keepalive,
        tableOff,
        plainWg,
        junkPreset,
        junk,
        awg15,
      };
      localStorage.setItem(GEN_STORE_KEY, JSON.stringify(prefs));
      toast({ title: tr.saved_settings });
    } catch {
      /* storage full/unavailable */
    }
  };

  const clearPrefs = () => {
    try {
      localStorage.removeItem(GEN_STORE_KEY);
      saved.current = null;
      toast({ title: tr.cleared_settings });
    } catch {
      /* ignore */
    }
  };

  const reserved = devices[0] ? reservedFromClientId(devices[0].clientId) : "";
  const keyMode = devices[0]?.keySource ?? null;
  const hasInvalid = violationCount > 0;

  /* ------------------------------ render ----------------------------- */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
      {/* ============================ controls ============================ */}
      <div>
        {/* ---- wizard tab bar ---- */}
        <div className="lux-card rounded-2xl p-1.5" role="tablist" aria-label={tr.gen_kicker}>
          <div className="grid grid-cols-5 gap-1">
            {tabLabels.map((label, i) => {
              const active = tab === i;
              const bad = tabBad[i] > 0;
              return (
                <button
                  key={i}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(i)}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    active ? "text-gold" : "text-ink/45 hover:text-ink/80"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="gen-tab-active"
                      className="absolute inset-0 rounded-xl border border-line-strong bg-gold/12"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    {tabIcons[i]}
                    {bad && <span className="h-1.5 w-1.5 rounded-full bg-bad" aria-hidden />}
                  </span>
                  <span className="relative z-10 max-w-full truncate text-[9px] font-bold leading-none">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 18 * dirSign }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 * dirSign }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 space-y-4"
          >
            {/* ---- tab 0 · endpoint ---- */}
            {tab === 0 && (
              <TabCard icon={<Globe2 size={17} />} title={tr.sec_endpoint} desc={tr.sec_endpoint_desc}>
          <Pills<EndpointMode>
            value={endpointMode}
            onChange={(v) => {
              setEndpointMode(v);
              if (v !== "list") setUseV6Endpoint(false);
            }}
            options={[
              { id: "auto", label: tr.mode_auto },
              { id: "list", label: tr.mode_list },
              { id: "scan", label: tr.mode_scan },
              { id: "manual", label: tr.mode_manual },
            ]}
          />

          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={endpointMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {endpointMode === "auto" && (
                  <p className="rounded-xl border border-line-soft bg-gold/5 px-4 py-3 text-[12px] leading-6 text-ink/60">
                    {tr.mode_auto_hint}
                  </p>
                )}

                {endpointMode === "list" && (
                  <div className="space-y-3">
                    <Label className="text-[11.5px] text-ink/55">{tr.endpoint_presets}</Label>
                    <div className="grid max-h-44 gap-2 overflow-y-auto pe-1 sm:grid-cols-2">
                      {ENDPOINT_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => {
                            setListIp(p.value);
                            setUseV6Endpoint(false);
                          }}
                          aria-pressed={listIp === p.value && !useV6Endpoint}
                          className={`rounded-xl border px-3 py-2.5 text-start transition-all duration-300 ${
                            listIp === p.value && !useV6Endpoint
                              ? "border-line-hi bg-gold/10"
                              : "border-ink/10 hover:border-line-strong"
                          }`}
                        >
                          <span className="conf-code block text-[11.5px] text-ink/85" dir="ltr">
                            {p.label}
                          </span>
                          {p.note && (
                            <span className="mt-0.5 block font-mono text-[9.5px] tracking-wider text-ink/35" dir="ltr">
                              {p.note}
                            </span>
                          )}
                        </button>
                      ))}
                      {/* IPv6 endpoint from the generated account */}
                      {deviceV6 && (
                        <button
                          onClick={() => setUseV6Endpoint(true)}
                          aria-pressed={useV6Endpoint}
                          className={`rounded-xl border px-3 py-2.5 text-start transition-all duration-300 ${
                            useV6Endpoint
                              ? "border-line-hi bg-gold/10"
                              : "border-ink/10 hover:border-line-strong"
                          }`}
                        >
                          <span className="conf-code block text-[11.5px] text-ink/85" dir="ltr">
                            [{deviceV6}]
                          </span>
                          <span className="mt-0.5 block font-mono text-[9.5px] tracking-wider text-ink/35" dir="ltr">
                            IPv6 · from your account
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-[1fr_130px] items-end gap-3">
                      <div>
                        <Label className="mb-1.5 text-[11.5px] text-ink/55">{tr.endpoint_ports}</Label>
                        <Select value={String(listPort)} onValueChange={(v) => setListPort(parseInt(v))}>
                          <SelectTrigger className="conf-code h-10 rounded-xl border-line bg-ink/5 text-[12.5px]" dir="ltr">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 border-line bg-popover">
                            {WARP_PORTS.map((p) => (
                              <SelectItem key={p} value={String(p)} className="conf-code text-[12px]">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        onClick={() => {
                          const p = ENDPOINT_PRESETS[Math.floor(Math.random() * ENDPOINT_PRESETS.length)];
                          setListIp(p.value);
                          setListPort(WARP_PORTS[Math.floor(Math.random() * WARP_PORTS.length)]);
                        }}
                        className="btn-ghost-lux flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-[12px]"
                        aria-label="random endpoint"
                      >
                        <Shuffle size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {endpointMode === "scan" && (
                  <div className="space-y-3">
                    {scanBest ? (
                      <>
                        <p className="text-[11.5px] text-ink/55">{tr.gen_scan_pick}</p>
                        <div className="grid max-h-56 gap-2 overflow-y-auto pe-1">
                          {bridgeResults.slice(0, 8).map((r) => {
                            const active = endpoint === r.endpoint;
                            return (
                              <button
                                key={r.endpoint}
                                onClick={() => {
                                  setScanPick(r.endpoint);
                                  setEndpoint(r.endpoint);
                                }}
                                aria-pressed={active}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-all duration-300 ${
                                  active ? "border-line-hi bg-gold/10" : "border-ink/10 hover:border-line-strong"
                                }`}
                              >
                                <span className="conf-code text-[11.5px] text-ink/85" dir="ltr">
                                  {r.endpoint}
                                </span>
                                <span className="flex shrink-0 items-center gap-2 font-mono text-[9.5px]" dir="ltr">
                                  {r.serverMs !== null && <span className="text-ok">{r.serverMs}ms</span>}
                                  {r.localMs !== null && <span className="text-ink/40">~{r.localMs}ms</span>}
                                  {active && <span className="font-bold text-gold">{tr.gen_scan_used}</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[12px] text-ink/50">
                        {tr.scan_empty_hint}
                      </p>
                    )}
                    <button
                      onClick={() => navigate("scanner")}
                      className="inline-flex items-center gap-2 text-[12px] text-gold transition-colors hover:text-goldsoft"
                    >
                      <Radar size={13} />
                      {tr.gen_scan_go}
                    </button>
                  </div>
                )}

                {endpointMode === "manual" && (
                  <div>
                    <Label htmlFor="ep-custom" className="mb-1.5 text-[11.5px] text-ink/55">
                      {tr.endpoint_custom}
                    </Label>
                    <Input
                      id="ep-custom"
                      dir="ltr"
                      value={manualEndpoint}
                      onChange={(e) => setManualEndpoint(e.target.value)}
                      placeholder={tr.endpoint_custom_ph}
                      className="conf-code h-10 rounded-xl border-line bg-ink/5 text-[12.5px]"
                    />
                    <VErr msg={msgOf("endpoint")} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
              </TabCard>
            )}

            {/* ---- tab 1 · connection ---- */}
            {tab === 1 && (
              <TabCard icon={<SlidersHorizontal size={17} />} title={tr.sec_conn} desc={tr.sec_conn_desc}>
          <div className="space-y-5">
            {/* MTU */}
            <div>
              <Label className="mb-2 block text-[11.5px] text-ink/55">{tr.mtu_label}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Pills
                  value={mtuMode}
                  onChange={setMtuMode}
                  options={[
                    { id: "preset", label: String(DEFAULT_MTU) },
                    { id: "auto", label: tr.mtu_auto },
                    { id: "custom", label: tr.dns_custom },
                  ]}
                />
                {mtuMode === "custom" && (
                  <div>
                    <Input
                      dir="ltr"
                      type="number"
                      value={mtuValue}
                      onChange={(e) => setMtuValue(e.target.value)}
                      className="conf-code h-9 w-24 rounded-lg border-line bg-ink/5 text-[12.5px]"
                      aria-label={tr.mtu_label}
                    />
                    <VErr msg={msgOf("mtu")} />
                  </div>
                )}
              </div>
            </div>

            {/* DNS */}
            <div>
              <Label className="mb-2 block text-[11.5px] text-ink/55">{tr.dns_label}</Label>
              <Pills<DnsPreset>
                value={dnsPreset}
                onChange={setDnsPreset}
                options={[
                  { id: "cf", label: tr.dns_cf },
                  { id: "google", label: tr.dns_google },
                  { id: "adguard", label: tr.dns_adguard },
                  { id: "none", label: tr.dns_none },
                  { id: "custom", label: tr.dns_custom },
                ]}
              />
              {dnsPreset === "custom" && (
                <Input
                  dir="ltr"
                  value={dnsCustom}
                  onChange={(e) => setDnsCustom(e.target.value)}
                  placeholder={tr.dns_custom_ph}
                  aria-label={tr.dns_custom}
                  className="conf-code mt-2.5 h-9 rounded-lg border-line bg-ink/5 text-[12.5px]"
                />
              )}
            </div>

            {/* AllowedIPs */}
            <div>
              <Label className="mb-2 block text-[11.5px] text-ink/55">{tr.allowed_label}</Label>
              <Pills<AllowedPreset>
                value={allowedPreset}
                onChange={setAllowedPreset}
                options={[
                  { id: "all", label: tr.allowed_all },
                  { id: "v4", label: tr.allowed_v4 },
                  { id: "v6", label: tr.allowed_v6 },
                  { id: "custom", label: tr.allowed_custom },
                ]}
              />
              {allowedPreset === "custom" && (
                <Input
                  dir="ltr"
                  value={allowedCustom}
                  onChange={(e) => setAllowedCustom(e.target.value)}
                  placeholder={tr.allowed_custom_ph}
                  aria-label={tr.allowed_label}
                  className="conf-code mt-2.5 h-9 rounded-lg border-line bg-ink/5 text-[12.5px]"
                />
              )}
            </div>

            {/* keepalive + listenport + table */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-[11.5px] text-ink/55">{tr.keepalive_label}</Label>
                <Select value={String(keepalive)} onValueChange={(v) => setKeepalive(parseInt(v))}>
                  <SelectTrigger className="conf-code h-10 rounded-xl border-line bg-ink/5 text-[12.5px]" dir="ltr">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-line bg-popover">
                    {[0, 5, 15, 25, 60, 120].map((v) => (
                      <SelectItem key={v} value={String(v)} className="conf-code text-[12px]">
                        {v === 0 ? tr.keepalive_off : v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="listen-port" className="mb-1.5 text-[11.5px] text-ink/55">
                  {tr.listen_label}
                </Label>
                <Input
                  id="listen-port"
                  dir="ltr"
                  type="number"
                  value={listenPort}
                  onChange={(e) => setListenPort(e.target.value)}
                  placeholder={tr.listen_ph}
                  className="conf-code h-10 rounded-xl border-line bg-ink/5 text-[12.5px]"
                />
                <VErr msg={msgOf("listen")} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-ink/8 px-4 py-3">
              <span className="conf-code text-[12px] text-ink/70">{tr.table_label}</span>
              <Switch checked={tableOff} onCheckedChange={setTableOff} aria-label={tr.table_label} />
            </div>

            {/* preferences persistence */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
              <button onClick={savePrefs} className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px]">
                <Save size={12} />
                {tr.save_settings}
              </button>
              <button
                onClick={clearPrefs}
                className="flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-1.5 text-[11.5px] text-ink/55 transition-all hover:text-ink/85"
              >
                <Trash2 size={12} />
                {tr.clear_settings}
              </button>
              <p className="w-full text-[10px] leading-5 text-ink/35">{tr.settings_note}</p>
            </div>
          </div>
              </TabCard>
            )}

            {/* ---- tab 2 · anti-DPI ---- */}
            {tab === 2 && (
              <TabCard icon={<Sparkles size={17} />} title={tr.sec_awg} desc={tr.sec_awg_desc}>
          <div className="space-y-5">
            {/* protocol mode */}
            <div>
              <Label className="mb-2 block text-[11.5px] text-ink/55">{tr.proto_label}</Label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    { id: false, label: tr.proto_awg, hint: tr.proto_awg_hint },
                    { id: true, label: tr.proto_plain, hint: tr.proto_plain_hint },
                  ] as const
                ).map((p) => (
                  <button
                    key={String(p.id)}
                    onClick={() => setPlainWg(p.id)}
                    aria-pressed={plainWg === p.id}
                    className={`rounded-xl border p-3.5 text-start transition-all duration-300 ${
                      plainWg === p.id
                        ? "border-line-hi bg-gold/10"
                        : "border-ink/10 hover:border-line-strong"
                    }`}
                  >
                    <span className={`block text-[13px] font-bold ${plainWg === p.id ? "text-goldsoft" : "text-ink/85"}`}>
                      {p.label}
                    </span>
                    <span className="mt-1 block text-[10.5px] leading-5 text-ink/40">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!plainWg && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* junk presets */}
                    <div>
                      <Label className="mb-2 block text-[11.5px] text-ink/55">{tr.junk_preset_label}</Label>
                      <Pills<JunkPresetId>
                        value={junkPreset}
                        onChange={applyJunkPreset}
                        options={[
                          { id: "light", label: tr.junk_light },
                          { id: "heavy", label: tr.junk_heavy },
                          { id: "random", label: tr.junk_random },
                          { id: "custom", label: tr.junk_custom },
                        ]}
                      />
                    </div>

                    {/* junk grid */}
                    <div className="rounded-xl border border-ink/8 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink/70">{tr.junk_fields}</span>
                        <button
                          onClick={() => {
                            setJunk((j) => ({ ...j, ...randomJunk(), ...randomHosts() }));
                            setJunkPreset("custom");
                          }}
                          className="flex items-center gap-1.5 rounded-lg border-line border px-2.5 py-1 font-mono text-[10.5px] text-gold transition-all hover:border-line-hi hover:text-goldsoft"
                        >
                          <Dices size={12} />
                          {tr.junk_randomize}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {JUNK_FIELDS.map((f) => (
                          <div key={f}>
                            <label htmlFor={`junk-${f}`} className="conf-code mb-1 block text-[10.5px] uppercase text-ink/40">
                              {f}
                            </label>
                            <Input
                              id={`junk-${f}`}
                              dir="ltr"
                              type="number"
                              min={0}
                              value={junk[f]}
                              onChange={(e) => {
                                setJunk((j) => ({ ...j, [f]: parseInt(e.target.value) || 0 }));
                                setJunkPreset("custom");
                              }}
                              aria-invalid={!!violations[f]}
                              className={`conf-code h-9 rounded-lg border bg-ink/5 text-[12px] ${
                                violations[f] ? "border-bad/60" : "border-ink/10"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1">
                        {(["jc", "jmin", "jmax", "s1", "s2", "h1", "h2", "h3", "h4", "h"] as const)
                          .filter((k) => violations[k])
                          .slice(0, 2)
                          .map((k) => (
                            <VErr key={k} msg={msgOf(k)} />
                          ))}
                      </div>
                    </div>

                    {/* AWG 1.5 */}
                    <div className="rounded-xl border border-ink/8 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-[12.5px] font-bold text-ink/85">{tr.awg15_label}</span>
                          <span className="mt-1 block text-[10.5px] leading-5 text-ink/40">{tr.awg15_hint}</span>
                        </div>
                        <Switch checked={awg15} onCheckedChange={setAwg15} aria-label={tr.awg15_label} />
                      </div>

                      <AnimatePresence initial={false}>
                        {awg15 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 grid gap-2.5">
                              {I_FIELDS.map((k) => (
                                <div key={k} className="flex items-center gap-2.5">
                                  <span className="conf-code w-7 shrink-0 text-[11.5px] font-bold text-gold">
                                    {k.toUpperCase()}
                                  </span>
                                  <Input
                                    dir="ltr"
                                    value={iVals[k]}
                                    onChange={(e) => setIVals((v) => ({ ...v, [k]: e.target.value }))}
                                    placeholder={k === "i1" ? "Warp default signature" : `${k.toUpperCase()} value`}
                                    aria-label={`I${k.slice(1)} signature`}
                                    className="conf-code h-9 rounded-lg border-ink/10 border bg-ink/5 text-[11.5px]"
                                  />
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => setIVals((v) => ({ ...v, i1: WARP_I1_DEFAULT }))}
                                  className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
                                >
                                  <ListChecks size={12} />
                                  {tr.load_default_i1}
                                </button>
                                <button
                                  onClick={() => setIVals((v) => ({ ...v, i1: "" }))}
                                  className="flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-1.5 text-[11px] text-ink/55 transition-all hover:text-ink/85"
                                >
                                  <Eraser size={12} />
                                  {tr.clear_i1}
                                </button>
                              </div>
                              <p className="mt-1 flex items-start gap-2 rounded-lg bg-gold/8 px-3 py-2.5 text-[10.5px] leading-5 text-goldsoft">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                {tr.awg15_warn}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
              </TabCard>
            )}

            {/* ---- tab 3 · advanced: hooks + account ---- */}
            {tab === 3 && (
              <>
        <TabCard icon={<PenLine size={17} />} title={tr.sec_hooks} desc={tr.sec_hooks_desc}>
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-bad/8 px-3 py-2.5 text-[11px] leading-5 text-bad">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {tr.hooks_warning}
          </p>
          <div className="grid gap-2.5">
            {(["preUp", "postUp", "preDown", "postDown"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2.5">
                <label htmlFor={`hook-${k}`} className="conf-code w-20 shrink-0 text-[11px] font-bold text-gold" dir="ltr">
                  {k}
                </label>
                <Input
                  id={`hook-${k}`}
                  dir="ltr"
                  value={(k === "preUp" ? undefined : undefined) ?? hooksVal(k)}
                  onChange={(e) => setHook(k, e.target.value)}
                  className="conf-code h-9 rounded-lg border-ink/10 border bg-ink/5 text-[11.5px]"
                />
              </div>
            ))}
          </div>
              </TabCard>

        {/* ---- account options (advanced tab) ---- */}
        <div className="lux-card rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="gen-multi" className="mb-2 block text-[11.5px] text-ink/55">
                {tr.multi_label}
              </Label>
              <div className="flex gap-2" role="group" aria-label={tr.multi_label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMultiCount(n)}
                    aria-pressed={multiCount === n}
                    className={`conf-code flex-1 rounded-xl border py-2 text-[12px] transition-all ${
                      multiCount === n
                        ? "border-line-hi bg-gold/10 text-goldsoft"
                        : "border-ink/10 text-ink/55 hover:border-line-strong"
                    }`}
                  >
                    {num(n, lang)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-5 text-ink/35">{tr.multi_hint}</p>
            </div>
            <div>
              <Label htmlFor="gen-license" className="mb-1.5 block text-[11.5px] text-ink/55">
                {tr.license_label}
              </Label>
              <Input
                id="gen-license"
                dir="ltr"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder={tr.license_ph}
                className="conf-code h-10 rounded-xl border-line bg-ink/5 text-[12.5px]"
              />
              {licenseState === "ok" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ok">
                  <ShieldCheck size={11} /> {tr.license_applied}
                </p>
              )}
              {licenseState === "failed" && (
                <p className="mt-1.5 text-[10.5px] text-bad">{tr.license_failed}</p>
              )}
              {licenseState === "bad" && (
                <p className="mt-1.5 text-[10.5px] text-bad">{tr.license_bad}</p>
              )}
            </div>
          </div>
        </div>
              </>
            )}

            {/* ---- tab 4 · build ---- */}
            {tab === 4 && (
              <>

        {/* ---- error banner ---- */}
        <AnimatePresence>
          {errCode && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bad/30 bg-bad/8 px-5 py-4"
            >
              <p className="flex items-center gap-2 text-[12.5px] text-bad">
                <AlertTriangle size={14} />
                {errText}
              </p>
              <button onClick={generate} className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2 text-[12px]">
                <RefreshCcw size={12} />
                {tr.retry}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- generate ---- */}
        <div className="space-y-3 pt-1">
          <Button
            onClick={generate}
            disabled={loading || hasInvalid}
            className="btn-gold h-[54px] w-full rounded-2xl text-[15px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2.5">
                <Loader2 className="h-5 w-5 animate-spin" />
                {tr.generating} {progress && `· ${progress}`}
              </span>
            ) : (
              <span className="flex items-center gap-2.5">
                <KeyRound size={17} />
                {devices.length > 0 ? tr.regenerate : tr.generate}
              </span>
            )}
          </Button>
          <p className="text-center text-[10.5px] leading-5 text-ink/40">{tr.privacy_note}</p>
        </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- wizard footer nav ---- */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setTab((v) => Math.max(0, v - 1))}
            disabled={tab === 0}
            className="btn-ghost-lux flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {lang === "fa" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {tr.gtab_prev}
          </button>
          <p className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-ink/45">
            <span className="font-mono" dir="ltr">
              {num(tab + 1, lang)} / {num(5, lang)}
            </span>
            {tabBad[tab] > 0 ? (
              <span className="flex items-center gap-1 text-bad">
                <AlertTriangle size={11} />
                {tr.gtab_invalid}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-ok">
                <CheckCircle2 size={11} />
                {tr.gtab_valid}
              </span>
            )}
          </p>
          {tab < 4 ? (
            <button
              onClick={() => setTab((v) => Math.min(4, v + 1))}
              className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px]"
            >
              {tr.gtab_next}
              {lang === "fa" ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span aria-hidden className="hidden w-[104px] sm:block" />
          )}
        </div>
      </div>

      {/* ============================ output ============================ */}
      <div className={`flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start ${tab === 4 ? "" : "hidden lg:flex"}`}>
        <div className="gold-edge lux-card-strong relative overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="conf-code text-[11.5px] text-ink/45" dir="ltr">
              WARP_AmneziaWG.conf
            </span>
            <div className="flex items-center gap-2">
              {conf && (
                <>
                  <span className="hidden items-center gap-1.5 font-mono text-[9.5px] tracking-[0.2em] text-ok sm:flex">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" />
                    {tr.output_live}
                  </span>
                  <button
                    onClick={showQr}
                    className="rounded-lg border border-line p-2 text-gold transition-all hover:border-line-hi hover:text-goldsoft"
                    aria-label={tr.qr_title}
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    onClick={copy}
                    className="rounded-lg border border-line p-2 text-gold transition-all hover:border-line-hi hover:text-goldsoft"
                    aria-label={tr.copy}
                  >
                    <Copy size={14} />
                  </button>
                  {devices.length > 1 ? (
                    <button onClick={downloadZip} className="btn-gold flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px]">
                      <FileArchive size={13} />
                      {tr.zip_download} ({num(devices.length, lang)})
                    </button>
                  ) : (
                    <button onClick={downloadSingle} className="btn-gold flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px]">
                      <Download size={13} />
                      {tr.download}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-[420px]">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center"
                >
                  <div className="text-center">
                    <div className="relative mx-auto h-16 w-16">
                      <span className="radar-sweep absolute inset-0 rounded-full border border-dashed border-line-hi" />
                      <span className="absolute inset-4 rounded-full bg-gold/25" />
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-goldsoft" />
                    </div>
                    <p className="mt-5 text-[12.5px] text-ink/55">
                      {tr.generating} {progress && `· ${progress}`}
                    </p>
                  </div>
                </motion.div>
              )}

              {conf && !loading && (
                <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ConfView conf={conf} />
                </motion.div>
              )}

              {!conf && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center"
                >
                  <div className="max-w-[240px] text-center">
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-line text-gold/40">
                      <KeyRound size={24} />
                    </div>
                    <p className="text-[12.5px] leading-7 text-ink/45">{tr.output_placeholder}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* account info */}
        <AnimatePresence>
          {devices[0] && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="lux-card rounded-3xl p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-ok" />
                  <span className="text-[13px] font-bold text-ink/85">{tr.account_title}</span>
                </div>
                {keyMode && (
                  <span
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-wider ${
                      keyMode === "client" ? "border-ok/40 text-ok" : "border-line-strong text-gold"
                    }`}
                  >
                    <ShieldCheck size={10} />
                    {keyMode === "client" ? tr.key_source_client : tr.key_source_server}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3">
                {[
                  [tr.account_id, devices[0].accountId],
                  [tr.device_id, devices[0].deviceId],
                  [tr.account_type, devices[0].warpPlus ? `${devices[0].accountType} (WARP+)` : devices[0].accountType],
                  [tr.license, devices[0].license],
                  [tr.created, new Date(devices[0].createdAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")],
                  [tr.source, devices[0].registerSource],
                  [tr.reserved_label, reserved || "—"],
                ].map(([k, v], i) => (
                  <div key={i} className="min-w-0">
                    <dt className="text-[10px] text-ink/40">{k}</dt>
                    <dd className="conf-code mt-0.5 truncate text-[11px] text-ink/75" dir="ltr" title={String(v)}>
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
              {reserved && <p className="mt-2.5 text-[10px] text-ink/35">{tr.reserved_hint}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="border-line bg-popover sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px] tracking-wide text-goldsoft">
              {tr.qr_title}
            </DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="space-y-4 pb-2">
              <img src={qrData} alt={tr.qr_title} className="mx-auto w-full max-w-[320px] rounded-2xl" />
              <p className="text-center text-[12px] text-ink/55">{tr.qr_hint}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  /* hooks helpers (defined after render — stable references via closure) */
  function hooksVal(k: "preUp" | "postUp" | "preDown" | "postDown"): string {
    return hooksState[k];
  }
  function setHook(k: "preUp" | "postUp" | "preDown" | "postDown", v: string) {
    setHooksState((h) => ({ ...h, [k]: v }));
  }
}
