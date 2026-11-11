"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { withBase } from "@/lib/paths";

/** Static-export builds (GitHub Pages) have no server: skip server-only calls. */
const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldOff,
  Radar,
  Play,
  Square,
  Check,
  X,
  Hourglass,
  SkipForward,
  Send,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  RotateCcw,
  FileDown,
  Lightbulb,
  Plus,
  PlusCircle,
  CheckCheck,
  Copy,
} from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { num } from "@/lib/fa";
import { useToast } from "@/hooks/use-toast";
import { SCAN_RANGES, DEFAULT_PORT, WARP_PORTS } from "@/lib/awg";
import { runLocalScan, sampleIps, probeLocal, type LocalProbeResult } from "@/lib/scan-client";
import { useScannerBridge, type ScannerEndpoint } from "@/lib/scan-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Phase = "idle" | "local" | "server" | "done";
type SortKey = "score" | "local" | "loss" | "server";

interface Row {
  ip: string;
  port: number;
  local: { avg: number | null; loss: number; pings: number } | null;
  server: { alive: boolean; ms: number | null } | null;
  state: "pending" | "local-done" | "server-done" | "skipped";
}

function scoreOf(r: Row): number {
  if (!r.local || r.local.avg === null) return 0;
  const serverBonus = r.server?.alive ? 500 : 0;
  const lossPenalty = Math.round(r.local.loss * 100);
  const serverPenalty = r.server?.alive ? (r.server.ms ?? 999) / 2 : 0;
  return Math.max(1, 400 + serverBonus - Math.round(r.local.avg / 4) - lossPenalty - serverPenalty);
}

function ProgressRing({ pct, phase }: { pct: number; phase: Phase }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const lang = useLang((s) => s.lang);
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line-soft)" strokeWidth="3" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#goldRing)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-300"
        />
        <defs>
          <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--golddeep)" />
            <stop offset="55%" stopColor="var(--goldsoft)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {phase === "idle" || phase === "done" ? (
          <Radar size={26} className={phase === "done" ? "text-ok" : "text-gold/60"} />
        ) : (
          <span className="radar-sweep block h-9 w-9 rounded-full border border-dashed border-line-hi" />
        )}
      </div>
      <div className="absolute inset-x-0 -bottom-1 text-center font-mono text-[11px] text-gold" dir="ltr">
        {num(Math.round(pct * 100), lang)}%
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: Row["state"] }) {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const map: Record<Row["state"], { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: tr.status_pending, cls: "border-line-strong text-gold", icon: <Hourglass size={11} /> },
    "local-done": { label: tr.status_pending, cls: "border-line-strong text-gold", icon: <Hourglass size={11} /> },
    "server-done": { label: tr.status_alive, cls: "border-ok/40 text-ok", icon: <Check size={11} /> },
    skipped: { label: tr.status_skipped, cls: "border-ink/15 text-ink/35", icon: <SkipForward size={11} /> },
  };
  const m = map[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9.5px] tracking-wider ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function LatencyBar({ ms, max, tone }: { ms: number | null; max: number; tone: "local" | "server" }) {
  if (ms === null) return <span className="font-mono text-[10px] text-ink/25">—</span>;
  const w = Math.max(8, Math.min(100, (1 - ms / max) * 100));
  const color =
    tone === "local"
      ? "bg-gradient-to-r from-golddeep to-goldsoft"
      : "bg-gradient-to-r from-ok/60 to-ok";
  return (
    <div className="flex items-center gap-2" dir="ltr">
      <div className="h-1 w-14 overflow-hidden rounded-full bg-ink/7">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className="font-mono text-[10px] text-ink/60">{ms}ms</span>
    </div>
  );
}

function LossCell({ loss, lang }: { loss: number; lang: "fa" | "en" }) {
  if (loss <= 0) {
    return <span className="font-mono text-[10px] text-ok">0%</span>;
  }
  return (
    <span className={`font-mono text-[10px] ${loss >= 0.5 ? "text-bad" : "text-gold"}`}>
      {num(Math.round(loss * 100), lang)}%
    </span>
  );
}

function SortTh({
  k,
  label,
  sortKey,
  sortDir,
  onSort,
  className = "",
}: {
  k: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: 1 | -1;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3 text-start font-medium ${className}`}>
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-goldsoft ${sortKey === k ? "text-gold" : ""}`}
        aria-label={`sort by ${label}`}
      >
        {label}
        <span className="text-[8px]">{sortKey === k ? (sortDir === -1 ? "▼" : "▲") : "⇅"}</span>
      </button>
    </th>
  );
}

export function IpScanner() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const { toast } = useToast();
  const pushResults = useScannerBridge((s) => s.pushResults);

  const [ack, setAck] = useState(false);
  const [selectedRanges, setSelectedRanges] = useState<string[]>(["r192", "r193", "r96", "r97"]);
  const [verifyPort, setVerifyPort] = useState<number>(DEFAULT_PORT);
  const [perRange, setPerRange] = useState(6);
  const [pingCount, setPingCount] = useState(2);
  const [concurrency, setConcurrency] = useState(10);
  const [timeoutMs, setTimeoutMs] = useState(2500);
  const [customIps, setCustomIps] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customErr, setCustomErr] = useState<"" | "bad" | "dup" | "max">("");
  const [picked, setSelected] = useState<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState("");
  const [aliveOnly, setAliveOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const stopRef = useRef(false);
  const lastSettings = useRef<{ ranges: string[]; port: number; per: number; pings: number; conc: number; timeout: number } | null>(null);

  const toggleRange = (id: string) => {
    setSelectedRanges((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  /* ---------- quick presets ---------- */
  const applyPreset = (p: "fast" | "bal" | "deep") => {
    if (p === "fast") {
      setPerRange(4);
      setPingCount(1);
      setConcurrency(14);
      setTimeoutMs(2000);
    } else if (p === "bal") {
      setPerRange(6);
      setPingCount(2);
      setConcurrency(10);
      setTimeoutMs(2500);
    } else {
      setPerRange(10);
      setPingCount(3);
      setConcurrency(14);
      setTimeoutMs(3000);
    }
  };

  /* ---------- custom IPs ---------- */
  const addCustom = () => {
    const parts = customInput
      .split(/[\s,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const v4re = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(:\d{1,5})?$/;
    const next = [...customIps];
    let err: "" | "bad" | "dup" | "max" = "";
    for (const p of parts) {
      if (!v4re.test(p)) {
        err = "bad";
        continue;
      }
      const base = p.replace(/:\d+$/, "");
      if (next.some((c) => c.replace(/:\d+$/, "") === base)) {
        err = "dup";
        continue;
      }
      if (next.length >= 40) {
        err = "max";
        break;
      }
      next.push(p);
    }
    setCustomErr(err);
    if (next.length > customIps.length) {
      setCustomIps(next);
      setCustomInput("");
    }
  };

  /* ---------- selection ---------- */
  const toggleSel = (ip: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(ip)) n.delete(ip);
      else n.add(ip);
      return n;
    });
  };
  const selectAlive = () => {
    setSelected(new Set(rows.filter((r) => r.local && r.local.avg !== null).map((r) => r.ip)));
  };

  const selected = useMemo(() => SCAN_RANGES.filter((r) => selectedRanges.includes(r.id)), [selectedRanges]);

  const aliveCount = rows.filter((r) => r.local && r.local.avg !== null).length;
  const verifiedCount = rows.filter((r) => r.server?.alive).length;
  const best = useMemo(() => {
    const ok = rows.filter((r) => r.server?.alive && r.server.ms !== null);
    if (ok.length === 0) return null;
    return ok.reduce((a, b) => ((a.server!.ms ?? 9e9) <= (b.server!.ms ?? 9e9) ? a : b));
  }, [rows]);

  const localMax = useMemo(() => Math.max(80, ...rows.map((r) => r.local?.avg ?? 0)), [rows]);
  const serverMax = useMemo(() => Math.max(80, ...rows.map((r) => r.server?.ms ?? 0)), [rows]);

  /* ---------- scan ---------- */
  const scan = useCallback(
    async (override?: { ranges: string[]; port: number; per: number; pings: number; conc: number; timeout: number }) => {
      const settings = override ?? {
        ranges: selectedRanges,
        port: verifyPort,
        per: perRange,
        pings: pingCount,
        conc: concurrency,
        timeout: timeoutMs,
      };
      lastSettings.current = settings;
      const ranges = SCAN_RANGES.filter((r) => settings.ranges.includes(r.id));
      if (ranges.length === 0) return;

      stopRef.current = false;
      setPhase("local");
      setRows([]);
      setProgress(0);
      setAliveOnly(false);
      setFilter("");
      setSelected(new Set());

      const customTargets = customIps.map((c) => {
        const m = c.match(/^(.+):(\d+)$/);
        return m ? { ip: m[1], port: parseInt(m[2]) } : { ip: c, port: settings.port };
      });
      const seen = new Set<string>();
      const entries = [
        ...sampleIps(ranges, settings.per).map((ip) => ({ ip, port: settings.port })),
        ...customTargets,
      ].filter((e) => (seen.has(e.ip) ? false : (seen.add(e.ip), true)));
      if (entries.length === 0) return;
      const total = entries.length;

      // ── phase 1: local browser scan, multi-ping for avg + loss ──
      const localMap = new Map<string, Row["local"]>();
      let completed = 0;

      const onProgress = () => {
        completed += 1;
        setProgress(completed / total);
        setRows(
          entries.map(
            (e): Row => ({
              ip: e.ip,
              port: e.port,
              local: localMap.get(e.ip) ?? null,
              server: null,
              state: localMap.has(e.ip) ? "local-done" : "pending",
            })
          )
        );
      };

      // wrap multi-ping into the runner: probeLocal is called pings times
      const queue = [...entries];
      const worker = async () => {
        while (queue.length > 0) {
          if (stopRef.current) return;
          const e = queue.shift()!;
          let ok = 0;
          let sum = 0;
          for (let p = 0; p < settings.pings; p++) {
            const r: LocalProbeResult = await probeLocal(e.ip, settings.timeout);
            if (r.alive && r.ms !== null) {
              ok += 1;
              sum += r.ms;
            }
            if (stopRef.current) break;
          }
          const loss = (settings.pings - ok) / settings.pings;
          localMap.set(e.ip, { avg: ok > 0 ? Math.round(sum / ok) : null, loss, pings: settings.pings });
          onProgress();
        }
      };
      await Promise.all(Array.from({ length: Math.min(settings.conc, entries.length) }, worker));

      if (stopRef.current) {
        setPhase("done");
        return;
      }

      // ── phase 2: server WG-handshake verify on alive IPs (top 16 by local ms) ──
      const alive = entries
        .filter((e) => (localMap.get(e.ip)?.avg ?? null) !== null)
        .sort((a, b) => (localMap.get(a.ip)!.avg ?? 9e9) - (localMap.get(b.ip)!.avg ?? 9e9))
        .slice(0, 16);

      if (alive.length === 0) {
        setPhase("done");
        return;
      }

      if (STATIC_DEMO) {
        /* static build: no server handshake — local results are final */
        const bridge: ScannerEndpoint[] = [];
        for (const e of entries) {
          const l = localMap.get(e.ip);
          if (!l || l.avg === null) continue;
          bridge.push({
            endpoint: `${e.ip}:${e.port}`,
            localMs: l.avg,
            serverMs: null,
            score: -l.avg / 4,
            at: Date.now(),
          });
        }
        pushResults(bridge);
        setPhase("done");
        return;
      }
      setPhase("server");
      setRows((prev) =>
        prev.map((r) =>
          alive.some((a) => a.ip === r.ip)
            ? r
            : { ...r, state: r.local && r.local.avg !== null ? "skipped" : r.state }
        )
      );

      try {
        const res = await fetch(withBase("/api/scan"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targets: alive.map((a) => ({ ip: a.ip, port: a.port })),
            timeoutMs: Math.min(settings.timeout, 2500),
            concurrency: 8,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          results?: { ip: string; port: number; alive: boolean; ms: number | null }[];
        };
        const serverMap = new Map((data.results || []).map((r) => [r.ip, { alive: r.alive, ms: r.ms }]));

        setRows((prev) =>
          prev.map((r) => {
            const s = serverMap.get(r.ip);
            return s ? { ...r, server: s, state: "server-done" } : r;
          })
        );

        // push verified bridge results
        const bridge: ScannerEndpoint[] = [];
        for (const e of entries) {
          const l = localMap.get(e.ip);
          if (!l || l.avg === null) continue;
          const s = serverMap.get(e.ip);
          bridge.push({
            endpoint: `${e.ip}:${e.port}`,
            localMs: l.avg,
            serverMs: s?.alive ? (s.ms ?? null) : null,
            score: (s?.alive ? 500 : 0) - l.avg / 4,
            at: Date.now(),
          });
        }
        pushResults(bridge);
      } catch {
        toast({ title: tr.err_network, variant: "destructive" });
      }

      setPhase("done");
    },
    [selectedRanges, verifyPort, perRange, pingCount, concurrency, timeoutMs, customIps, pushResults, toast, tr.err_network]
  );

  const rescan = () => {
    if (lastSettings.current) scan(lastSettings.current);
    else scan();
  };

  const totalScanned = rows.length;
  const pct = phase === "idle" ? 0 : phase === "local" ? progress * 0.7 : phase === "server" ? 0.85 : 1;

  const sendToGenerator = (r: Row) => {
    const ep: ScannerEndpoint = {
      endpoint: `${r.ip}:${r.port}`,
      localMs: r.local?.avg ?? null,
      serverMs: r.server?.alive ? (r.server.ms ?? null) : null,
      score: scoreOf(r),
      at: Date.now(),
    };
    useScannerBridge.getState().pick(ep);
    toast({ title: tr.sent_to_generator });
  };

  const sendSelected = () => {
    const chosen = rows.filter((r) => picked.has(r.ip) && (r.local?.avg !== null || r.server?.alive));
    if (chosen.length === 0) return;
    const eps: ScannerEndpoint[] = chosen.map((r) => ({
      endpoint: `${r.ip}:${r.port}`,
      localMs: r.local?.avg ?? null,
      serverMs: r.server?.alive ? (r.server.ms ?? null) : null,
      score: scoreOf(r),
      at: Date.now(),
    }));
    const existing = useScannerBridge
      .getState()
      .results.filter((e) => !eps.some((x) => x.endpoint === e.endpoint));
    useScannerBridge.getState().pushResults([...existing, ...eps]);
    useScannerBridge.getState().pick(eps.reduce((a, b) => (b.score > a.score ? b : a)));
    toast({ title: tr.scan_sel_sent.replace("{n}", num(eps.length, lang)) });
    setSelected(new Set());
  };

  const copyRow = async (r: Row) => {
    try {
      await navigator.clipboard.writeText(`${r.ip}:${r.port}`);
      toast({ title: tr.scan_copied_row });
    } catch {
      /* clipboard unavailable */
    }
  };

  /* ---------- export ---------- */
  const exportResults = (fmt: "csv" | "json", only = false) => {
    const src = only ? rows.filter((r) => picked.has(r.ip)) : rows;
    if (src.length === 0) return;
    let blob: Blob;
    let name: string;
    if (fmt === "json") {
      const payload = src.map((r) => ({
        ip: r.ip,
        port: r.port,
        localAvgMs: r.local?.avg ?? null,
        packetLoss: r.local?.loss ?? null,
        pings: r.local?.pings ?? 0,
        wgVerified: r.server?.alive ?? false,
        wgMs: r.server?.ms ?? null,
        score: scoreOf(r),
      }));
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      name = "salira_scan_results.json";
    } else {
      const head = "ip,port,local_avg_ms,packet_loss,pings,wg_verified,wg_ms,score";
      const lines = src.map((r) =>
        [
          r.ip,
          r.port,
          r.local?.avg ?? "",
          r.local ? Math.round(r.local.loss * 100) + "%" : "",
          r.local?.pings ?? "",
          r.server?.alive ? "yes" : "no",
          r.server?.ms ?? "",
          scoreOf(r),
        ].join(",")
      );
      blob = new Blob(["\uFEFF" + [head, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      name = "salira_scan_results.csv";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- view rows: filter + sort ---------- */
  const viewRows = useMemo(() => {
    let list = [...rows];
    if (aliveOnly) list = list.filter((r) => r.local && r.local.avg !== null);
    const q = filter.trim();
    if (q) list = list.filter((r) => r.ip.includes(q));
    const dir = sortDir;
    list.sort((a, b) => {
      switch (sortKey) {
        case "local":
          return ((a.local?.avg ?? 9e9) - (b.local?.avg ?? 9e9)) * dir;
        case "loss":
          return ((a.local?.loss ?? 1) - (b.local?.loss ?? 1)) * dir;
        case "server":
          return ((a.server?.ms ?? 9e9) - (b.server?.ms ?? 9e9)) * dir;
        default:
          return (scoreOf(b) - scoreOf(a)) * (dir === -1 ? 1 : -1);
      }
    });
    return list;
  }, [rows, aliveOnly, filter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(-1);
    }
  };

  const running = phase === "local" || phase === "server";
  const canStart = ack && !running && selected.length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      {/* ============================ controls ============================ */}
      <div className="space-y-4">
        {/* warning checklist */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="gold-edge rounded-3xl p-1">
          <div className="rounded-[18px] bg-gradient-to-b from-panel to-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-bad/30 bg-bad/8 text-bad">
                <ShieldOff size={18} />
              </span>
              <p className="text-[13.5px] font-bold text-ink">{tr.scan_warning_title}</p>
            </div>

            <ul className="mt-4 space-y-2.5">
              {[tr.scan_warning_1, tr.scan_warning_2, tr.scan_warning_3].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] leading-6 text-ink/65">
                  <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-line-hi text-gold">
                    <Check size={10} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-3 rounded-xl bg-ink/4 px-3.5 py-2.5 text-[10.5px] leading-5 text-ink/45">
              {tr.scan_warning_note}
            </p>
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-ok/8 px-3.5 py-2.5 text-[10.5px] leading-5 text-ok">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              {tr.scan_privacy}
            </p>

            {/* mandatory acknowledgment checkbox */}
            <label
              className={`mt-4 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                ack ? "border-ok/40 bg-ok/8" : "border-line-strong bg-ink/4"
              }`}
            >
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[#8b54ff]"
                aria-label={tr.scan_ack}
              />
              <span className={`text-[12.5px] font-bold ${ack ? "text-ok" : "text-ink/70"}`}>{tr.scan_ack}</span>
              {ack && <Check size={14} className="ms-auto text-ok" />}
            </label>
          </div>
        </motion.div>

        {/* ranges + controls */}
        <div className={`lux-card rounded-2xl p-5 transition-opacity duration-500 ${ack ? "" : "pointer-events-none opacity-40"}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink/80">
              <Globe2 size={14} className="text-gold" />
              {tr.scan_ranges}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink/40">{tr.scan_preset}:</span>
              {(
                [
                  { id: "fast", label: tr.scan_p_fast },
                  { id: "bal", label: tr.scan_p_bal },
                  { id: "deep", label: tr.scan_p_deep },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="rounded-full border border-ink/10 px-2.5 py-1 text-[10px] text-ink/55 transition-all hover:border-gold/50 hover:text-gold"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCAN_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleRange(r.id)}
                aria-pressed={selectedRanges.includes(r.id)}
                className={`conf-code rounded-full border px-3 py-1.5 text-[10.5px] transition-all duration-300 ${
                  selectedRanges.includes(r.id)
                    ? "border-line-hi bg-gold/12 text-goldsoft"
                    : "border-ink/10 text-ink/50 hover:border-line-strong"
                }`}
                dir="ltr"
              >
                {r.cidr}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-ink/55">
                <ShieldCheck size={13} className="text-gold" />
                {tr.scan_ports}
              </p>
              <Select value={String(verifyPort)} onValueChange={(v) => setVerifyPort(parseInt(v))}>
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
            <div>
              <p className="mb-1.5 text-[11.5px] text-ink/55">{tr.scan_count}</p>
              <div className="flex gap-2" role="group" aria-label={tr.scan_count}>
                {[4, 6, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPerRange(n)}
                    aria-pressed={perRange === n}
                    className={`conf-code flex-1 rounded-xl border py-2.5 text-[12px] transition-all ${
                      perRange === n
                        ? "border-line-hi bg-gold/10 text-goldsoft"
                        : "border-ink/10 text-ink/55 hover:border-line-strong"
                    }`}
                  >
                    {num(n, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-[11px] text-ink/55">{tr.ping_count}</p>
              <div className="flex gap-1.5" role="group" aria-label={tr.ping_count}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPingCount(n)}
                    aria-pressed={pingCount === n}
                    className={`conf-code flex-1 rounded-lg border py-2 text-[11px] transition-all ${
                      pingCount === n
                        ? "border-line-hi bg-gold/10 text-goldsoft"
                        : "border-ink/10 text-ink/50 hover:border-line-strong"
                    }`}
                  >
                    {num(n, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] text-ink/55">{tr.concurrency}</p>
              <Select value={String(concurrency)} onValueChange={(v) => setConcurrency(parseInt(v))}>
                <SelectTrigger className="conf-code h-9 rounded-lg border-line bg-ink/5 text-[11.5px]" dir="ltr">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-line bg-popover">
                  {[6, 10, 14, 18].map((n) => (
                    <SelectItem key={n} value={String(n)} className="conf-code text-[11.5px]">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] text-ink/55">{tr.timeout_lbl}</p>
              <Select value={String(timeoutMs)} onValueChange={(v) => setTimeoutMs(parseInt(v))}>
                <SelectTrigger className="conf-code h-9 rounded-lg border-line bg-ink/5 text-[11.5px]" dir="ltr">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-line bg-popover">
                  {[1500, 2500, 3500].map((n) => (
                    <SelectItem key={n} value={String(n)} className="conf-code text-[11.5px]">
                      {n}ms
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => scan()}
              disabled={!canStart}
              className="btn-gold flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <>
                  <Radar size={16} className="animate-pulse" />
                  {tr.scan_running}
                </>
              ) : (
                <>
                  <Play size={15} />
                  {tr.scan_start}
                </>
              )}
            </button>
            {running && (
              <button
                onClick={() => (stopRef.current = true)}
                className="flex h-12 items-center gap-2 rounded-xl border border-bad/40 px-5 text-[13px] text-bad transition-all hover:bg-bad/8"
              >
                <Square size={14} />
                {tr.scan_stop}
              </button>
            )}
            {phase === "done" && !running && (
              <button
                onClick={rescan}
                className="btn-ghost-lux flex h-12 items-center gap-2 rounded-xl px-5 text-[13px]"
              >
                <RotateCcw size={14} />
                {tr.scan_rescan}
              </button>
            )}
          </div>

          {phase === "done" && rows.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-ink/45">{tr.scan_export}:</span>
              <button onClick={() => exportResults("csv")} className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]">
                <FileDown size={11} />
                {tr.export_csv}
              </button>
              <button onClick={() => exportResults("json")} className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]">
                <FileDown size={11} />
                {tr.export_json}
              </button>
            </div>
          )}
        </div>

        {/* custom IPs */}
        <div className={`lux-card rounded-2xl p-5 transition-opacity duration-500 ${ack ? "" : "pointer-events-none opacity-40"}`}>
          <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink/80">
            <PlusCircle size={14} className="text-gold" />
            {tr.scan_custom_title}
          </p>
          <p className="mt-1 text-[10.5px] leading-5 text-ink/40">{tr.scan_custom_hint}</p>
          <div className="mt-3 flex gap-2">
            <input
              dir="ltr"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setCustomErr("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder={tr.scan_custom_ph}
              aria-label={tr.scan_custom_title}
              className="conf-code h-9 flex-1 rounded-lg border border-ink/10 bg-ink/5 px-3 text-[11.5px] text-ink/80 placeholder:text-ink/30"
            />
            <button
              onClick={addCustom}
              className="btn-ghost-lux flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[11.5px]"
            >
              <Plus size={12} />
              {tr.scan_custom_add}
            </button>
          </div>
          {customErr === "bad" && <p className="mt-1.5 text-[10.5px] text-bad">{tr.scan_custom_bad}</p>}
          {customErr === "dup" && <p className="mt-1.5 text-[10.5px] text-gold">{tr.scan_custom_dup}</p>}
          {customErr === "max" && <p className="mt-1.5 text-[10.5px] text-gold">{tr.scan_custom_max}</p>}
          {customIps.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {customIps.map((c) => (
                <span
                  key={c}
                  className="conf-code flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/8 py-1 pe-1.5 ps-3 text-[10.5px] text-goldsoft"
                  dir="ltr"
                >
                  {c}
                  <button
                    onClick={() => setCustomIps((v) => v.filter((x) => x !== c))}
                    aria-label={`remove ${c}`}
                    className="grid h-4 w-4 place-items-center rounded-full text-ink/40 transition-colors hover:bg-bad/15 hover:text-bad"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* two engines explanation */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="lux-card rounded-2xl p-4">
            <p className="font-mono text-[9.5px] tracking-[0.22em] text-gold">{tr.scan_engine_local}</p>
            <p className="mt-2 text-[11px] leading-6 text-ink/55">{tr.scan_engine_local_desc}</p>
          </div>
          <div className="lux-card rounded-2xl p-4">
            <p className="font-mono text-[9.5px] tracking-[0.22em] text-ok">{tr.scan_engine_server}</p>
            <p className="mt-2 text-[11px] leading-6 text-ink/55">{tr.scan_engine_server_desc}</p>
          </div>
        </div>
      </div>

      {/* ============================ results ============================ */}
      <div className="lux-card-strong gold-edge overflow-hidden rounded-3xl">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex items-center gap-4">
            <ProgressRing pct={pct} phase={phase} />
            <div>
              <p className="text-[13px] font-bold text-ink/85">
                {phase === "idle" && tr.scan_title}
                {phase === "local" && tr.scan_phase_local}
                {phase === "server" && tr.scan_phase_server}
                {phase === "done" && tr.scan_done}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[10.5px] text-ink/45" dir="ltr">
                <span>
                  <span className="text-ok">{num(aliveCount, lang)}</span> {tr.scan_summary_alive}
                </span>
                <span>
                  <span className="text-goldsoft">{num(verifiedCount, lang)}</span> WG ✓
                </span>
                <span>
                  <span className="text-ink/70">{num(totalScanned, lang)}</span> {tr.scan_summary_total}
                </span>
                {best && (
                  <span>
                    best <span className="text-goldsoft">{best.server?.ms}ms</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* filter bar */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={tr.filter_ph}
              dir="ltr"
              aria-label={tr.filter_ph}
              className="conf-code h-8 flex-1 rounded-lg border border-ink/10 bg-ink/5 px-3 text-[11.5px] text-ink/80 placeholder:text-ink/30"
            />
            <button
              onClick={() => setAliveOnly((a) => !a)}
              aria-pressed={aliveOnly}
              className={`rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                aliveOnly ? "border-ok/40 bg-ok/8 text-ok" : "border-ink/10 text-ink/50 hover:border-line-strong"
              }`}
            >
              {tr.alive_only}
            </button>
          </div>
        )}

        {/* rows */}
        <div className="max-h-[480px] min-h-[280px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="grid h-[280px] place-items-center">
              <div className="text-center">
                <Radar size={30} className="mx-auto text-gold/30" />
                <p className="mt-3 text-[12px] text-ink/40">{tr.scan_results_empty}</p>
              </div>
            </div>
          ) : viewRows.length === 0 ? (
            <div className="grid h-[200px] place-items-center text-[12px] text-ink/40">…</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
                <tr className="border-b border-line font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink/40">
                  <th className="w-8 ps-4">
                    <button
                      onClick={selectAlive}
                      title={tr.scan_select_alive}
                      aria-label={tr.scan_select_alive}
                      className="grid h-6 w-6 place-items-center rounded-md text-gold transition-colors hover:bg-gold/10"
                    >
                      <CheckCheck size={12} />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-start font-medium">{tr.col_endpoint}</th>
                  <SortTh k="local" label={tr.col_local} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="loss" label={tr.col_loss} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="server" label={tr.col_server} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="score" label={tr.col_score} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="pe-3" />
                  <th className="w-[88px] pe-4" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {viewRows.map((r, i) => (
                  <motion.tr
                    key={r.ip}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    className={`border-b border-ink/5 transition-colors hover:bg-gold/5 ${
                      r.server?.alive ? "bg-ok/5" : ""
                    }`}
                  >
                    <td className="ps-4">
                      <input
                        type="checkbox"
                        checked={picked.has(r.ip)}
                        disabled={!(r.local?.avg !== null || r.server?.alive)}
                        onChange={() => toggleSel(r.ip)}
                        className="h-3.5 w-3.5 accent-[#8b54ff] disabled:opacity-25"
                        aria-label={`${r.ip}:${r.port}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="conf-code text-[11.5px] text-ink/85" dir="ltr">
                        {r.ip}:{r.port}
                      </span>
                      <div className="mt-1.5">
                        <StatusPill state={r.state} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {r.local === null || r.local.avg === null ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-bad" dir="ltr">
                          <X size={11} />
                          {tr.status_dead}
                        </span>
                      ) : (
                        <LatencyBar ms={r.local.avg} max={localMax} tone="local" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.local ? <LossCell loss={r.local.loss} lang={lang} /> : <span className="font-mono text-[10px] text-ink/25">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {r.server === null ? (
                        <span className="font-mono text-[10px] text-ink/25">—</span>
                      ) : !r.server.alive ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-bad" dir="ltr">
                          <X size={11} />
                          {tr.status_dead}
                        </span>
                      ) : (
                        <LatencyBar ms={r.server.ms} max={serverMax} tone="server" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <span
                        className={`font-display text-[15px] ${
                          r.server?.alive ? "text-goldsoft" : r.local && r.local.avg !== null ? "text-gold/70" : "text-ink/25"
                        }`}
                        dir="ltr"
                      >
                        {scoreOf(r) > 0 ? num(scoreOf(r), lang) : "—"}
                      </span>
                    </td>
                    <td className="pe-4">
                      {(r.local?.avg !== null || r.server?.alive) && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyRow(r)}
                            title={tr.scan_copy_row}
                            aria-label={tr.scan_copy_row}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink/50 transition-all hover:border-line-hi hover:text-gold"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => sendToGenerator(r)}
                            title={tr.send_row}
                            aria-label={tr.send_row}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold transition-all hover:border-line-hi hover:bg-gold/10 hover:text-goldsoft"
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* empty-state suggestions */}
        <AnimatePresence>
          {phase === "done" && aliveCount === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-t border-bad/25 bg-bad/6 px-5 py-4"
            >
              <p className="flex items-center gap-2 text-[12px] font-bold text-bad">
                <AlertTriangle size={14} />
                {tr.scan_no_vpn}
              </p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center gap-2 text-[11.5px] text-ink/60">
                  <Lightbulb size={12} className="text-gold" />
                  {tr.empty_sug_title}
                </p>
                <ul className="space-y-1.5 ps-6">
                  {[tr.empty_sug_1, tr.empty_sug_2, tr.empty_sug_3, tr.empty_sug_4].map((s, i) => (
                    <li key={i} className="list-disc text-[11px] leading-5 text-ink/50">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* bulk selection bar */}
        <AnimatePresence>
          {picked.size > 0 && (
            <motion.div
              initial={{ y: 56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 56, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-gold/30 bg-panel/95 px-5 py-3 backdrop-blur"
            >
              <span className="flex items-center gap-2 text-[12px] font-bold text-goldsoft">
                <CheckCheck size={13} className="text-gold" />
                {tr.scan_sel_count.replace("{n}", num(picked.size, lang))}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={sendSelected} className="btn-gold flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px]">
                  <Send size={12} />
                  {tr.scan_send_sel}
                </button>
                <button
                  onClick={() => exportResults("csv", true)}
                  className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px]"
                >
                  <FileDown size={11} />
                  CSV
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  aria-label={tr.scan_stop}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 text-ink/45 transition-colors hover:border-bad/40 hover:text-bad"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
