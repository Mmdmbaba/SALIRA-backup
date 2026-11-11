"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Radar,
  ShieldCheck,
  Sparkles,
  Crosshair,
  Languages,
  Blocks,
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCcw,
  Send,
  Server,
  FileCheck2,
  Activity,
} from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { num } from "@/lib/fa";
import { useAppView } from "@/lib/view-store";
import { useScannerBridge, type ScannerEndpoint } from "@/lib/scan-store";
import { Reveal } from "./background-fx";
import { FaqList } from "./sections";
import { useStatusModalStore } from "./app-header";

const ease = [0.22, 1, 0.36, 1] as const;

function ViewHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="kicker justify-center">{kicker}</span>
      <h1 className="font-display mt-4 text-[28px] leading-snug text-ink sm:text-[34px]">{title}</h1>
      {sub && <p className="mt-3 text-[13px] leading-7 text-ink/55">{sub}</p>}
    </div>
  );
}

/* ============================== HOME — live console ============================== */

interface StatsData {
  ok: boolean;
  at: number;
  warp: { alive: boolean; ms: number | null };
  ranges: { ip: string; alive: boolean; ms: number | null }[];
  proxy: { alive: boolean; ms: number | null; host: string };
}

function readConfigsCount(): number {
  try {
    const raw = localStorage.getItem("salira-stats");
    return raw ? (JSON.parse(raw).configs ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function HomeView() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const navigate = useAppView((s) => s.navigate);
  const DirArrow = lang === "fa" ? ArrowLeft : ArrowRight;

  const [stats, setStats] = useState<StatsData | null>(null);
  const [checking, setChecking] = useState(true);
  const [configs, setConfigs] = useState(0);
  const resultsAll = useScannerBridge((s) => s.results);
  const recent = useMemo(() => resultsAll.slice(0, 3), [resultsAll]);
  const scanRunAt = useScannerBridge((s) => s.scanRunAt);

  const fetchStats = useCallback(async (force = false) => {
    setChecking(true);
    try {
      const res = await fetch(force ? "/api/stats?refresh=1" : "/api/stats", { cache: "no-store" });
      const data = (await res.json()) as StatsData;
      if (data.ok) setStats(data);
    } catch {
      /* keep previous stats */
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 4 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  useEffect(() => {
    setConfigs(readConfigsCount());
    const bump = () => setConfigs(readConfigsCount());
    window.addEventListener("salira-configs", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("salira-configs", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const aliveRanges = stats ? stats.ranges.filter((r) => r.alive).length : 0;
  const allOk = stats ? stats.warp.alive && aliveRanges > 0 : false;

  const features = [
    { icon: KeyRound, title: tr.f1_title, desc: tr.f1_desc },
    { icon: Sparkles, title: tr.f2_title, desc: tr.f2_desc },
    { icon: Crosshair, title: tr.f3_title, desc: tr.f3_desc },
    { icon: Radar, title: tr.f4_title, desc: tr.f4_desc },
    { icon: Languages, title: tr.f5_title, desc: tr.f5_desc },
    { icon: Blocks, title: tr.f6_title, desc: tr.f6_desc },
  ];

  const modules = [
    { view: "generator" as const, icon: KeyRound, title: tr.nav_generator, desc: tr.f1_title },
    { view: "scanner" as const, icon: Radar, title: tr.nav_scanner, desc: tr.f4_title },
    { view: "proxy" as const, icon: Send, title: tr.nav_proxy, desc: tr.dash_svc_proxy_hint },
    { view: "lab" as const, icon: FlaskConical, title: tr.lab_kicker, desc: tr.lab_sub },
  ];

  /* --- stat card shell --- */
  const StatCard = ({
    icon: Icon,
    label,
    hint,
    value,
    state,
    onClick,
    cta,
  }: {
    icon: typeof KeyRound;
    label: string;
    hint: string;
    value: string;
    state: "ok" | "bad" | "checking";
    onClick?: () => void;
    cta?: string;
  }) => (
    <div className="lux-card group relative overflow-hidden rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-gold/6 text-gold">
          <Icon size={16} />
        </span>
        {state === "checking" ? (
          <span className="flex items-center gap-1.5 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[8.5px] tracking-[0.18em] text-gold">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-gold" />
            {tr.svc_checking}
          </span>
        ) : state === "ok" ? (
          <span className="flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/8 px-2 py-0.5 font-mono text-[8.5px] tracking-[0.18em] text-ok">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" />
            {tr.svc_online}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-bad/35 bg-bad/8 px-2 py-0.5 font-mono text-[8.5px] tracking-[0.18em] text-bad">
            <span className="h-1.5 w-1.5 rounded-full bg-bad" />
            {tr.svc_offline}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11.5px] font-bold text-ink/70">{label}</p>
      <p className="font-display mt-1 text-[22px] leading-tight text-goldsoft" dir={lang === "fa" ? "rtl" : "ltr"}>
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-ink/40">{hint}</p>
      {cta && onClick && (
        <button
          onClick={onClick}
          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-gold transition-colors hover:text-goldsoft"
        >
          {cta}
          <DirArrow size={11} />
        </button>
      )}
    </div>
  );

  const updatedLabel = stats
    ? `${tr.dash_updated} · ${new Date(stats.at).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "";

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 lg:px-8">
      {/* ======== console header ======== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="kicker">{tr.dash_kicker}</span>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[9.5px] tracking-[0.18em] ${
              checking
                ? "border-line-strong text-gold"
                : allOk
                  ? "border-ok/40 bg-ok/8 text-ok"
                  : "border-bad/35 bg-bad/8 text-bad"
            }`}
          >
            <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${checking ? "bg-gold" : allOk ? "bg-ok" : "bg-bad"}`} />
            {checking ? tr.dash_status_checking : allOk ? tr.dash_status_ok : tr.dash_status_degraded}
          </span>
          <button
            onClick={() => fetchStats(true)}
            disabled={checking}
            aria-label={tr.dash_refresh}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold transition-colors hover:border-line-hi disabled:opacity-50"
          >
            <RefreshCcw size={13} className={checking ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ======== hero strip ======== */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.05, ease }}
        className="font-display mt-6 max-w-2xl text-[30px] leading-[1.2] text-ink sm:text-[40px]"
      >
        {tr.hero_title_1} <span className="gold-gradient-text">{tr.hero_title_2}</span> {tr.hero_title_3}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.12, ease }}
        className="mt-3 max-w-xl text-[13px] leading-7 text-ink/55"
      >
        {tr.hero_sub}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.18, ease }}
        className="mt-5 flex flex-wrap items-center gap-3"
      >
        <button onClick={() => navigate("generator")} className="btn-gold inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-[13.5px]">
          <KeyRound size={15} />
          {tr.hero_cta_primary}
        </button>
        <button onClick={() => navigate("proxy")} className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-gold/8 px-6 py-2.5 text-[13.5px] font-bold text-gold transition-colors hover:border-gold/70 hover:text-goldsoft">
          <Send size={15} />
          {tr.nav_proxy}
        </button>
        <button onClick={() => navigate("scanner")} className="btn-ghost-lux inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-[13.5px]">
          <Radar size={15} />
          {tr.hero_cta_secondary}
        </button>
      </motion.div>

      {/* ======== stat cards ======== */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label={tr.dash_svc_warp}
          hint={tr.dash_svc_warp_hint}
          value={checking && !stats ? "…" : stats?.warp.alive ? `${stats.warp.ms ?? "—"} ms` : "—"}
          state={checking && !stats ? "checking" : stats?.warp.alive ? "ok" : "bad"}
        />
        <StatCard
          icon={Activity}
          label={tr.dash_svc_ranges}
          hint={tr.dash_svc_ranges_hint}
          value={
            checking && !stats ? "…" : stats ? tr.dash_alive_of.replace("{a}", num(aliveRanges, lang)).replace("{b}", num(stats.ranges.length, lang)) : "—"
          }
          state={checking && !stats ? "checking" : stats && aliveRanges > 0 ? "ok" : "bad"}
        />
        <StatCard
          icon={Send}
          label={tr.dash_svc_proxy}
          hint={stats?.proxy.host ?? tr.dash_svc_proxy_hint}
          value={checking && !stats ? "…" : stats?.proxy.alive ? `${stats.proxy.ms ?? "—"} ms` : "—"}
          state={checking && !stats ? "checking" : stats?.proxy.alive ? "ok" : "bad"}
          cta={tr.dash_svc_proxy_setup}
          onClick={() => navigate("proxy")}
        />
        <StatCard
          icon={FileCheck2}
          label={tr.dash_svc_configs}
          hint={tr.dash_svc_configs_hint}
          value={num(configs, lang)}
          state={configs > 0 ? "ok" : "checking"}
          cta={tr.dash_open}
          onClick={() => navigate("generator")}
        />
      </div>

      {/* ======== main console grid ======== */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* live endpoint report */}
        <div className="gold-edge lux-card-strong rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                <Server size={15} className="text-gold" />
                {tr.dash_probe_title}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-ink/45">{tr.dash_probe_sub}</p>
            </div>
            {updatedLabel && (
              <span className="shrink-0 font-mono text-[9px] tracking-[0.14em] text-ink/35" dir="ltr">
                {updatedLabel}
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {(stats?.ranges ?? Array.from({ length: 7 }, (_, i) => ({ ip: ["162.159.192.1","162.159.193.1","162.159.195.1","188.114.96.1","188.114.97.1","188.114.98.1","188.114.99.1"][i], alive: false, ms: null }))).map(
              (r, i) => {
                const max = Math.max(80, ...(stats?.ranges.map((x) => x.ms ?? 0) ?? [80]));
                const w = r.ms !== null ? Math.max(8, Math.min(100, (1 - r.ms / max) * 100)) : 0;
                return (
                  <li key={r.ip} className="flex items-center gap-3 rounded-xl border border-line-soft px-3.5 py-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        checking && !stats ? "animate-pulse bg-gold/60" : r.alive ? "bg-ok" : "bg-ink/20"
                      }`}
                    />
                    <span className="conf-code w-[118px] shrink-0 text-[11px] text-ink/75" dir="ltr">
                      {r.ip}
                    </span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink/7">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${w}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05, ease }}
                        className="block h-full rounded-full bg-gradient-to-r from-golddeep to-goldsoft"
                      />
                    </span>
                    <span className="w-[64px] shrink-0 text-end font-mono text-[10px] text-ink/50" dir="ltr">
                      {r.alive && r.ms !== null ? `${r.ms}ms` : checking && !stats ? "…" : "—"}
                    </span>
                  </li>
                );
              }
            )}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] leading-4 text-ink/35">{tr.scan_privacy}</p>
            <button
              onClick={() => navigate("scanner")}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-gold transition-colors hover:text-goldsoft"
            >
              <Radar size={12} />
              {tr.dash_recent_open}
            </button>
          </div>
        </div>

        {/* modules + recent scan */}
        <div className="flex flex-col gap-4">
          <div className="lux-card rounded-3xl p-5">
            <p className="text-[13px] font-bold text-ink/85">{tr.dash_quick}</p>
            <ul className="mt-3 space-y-1.5">
              {modules.map((m, i) => {
                const Icon = m.icon;
                return (
                  <li key={m.view}>
                    <button
                      onClick={() => navigate(m.view)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-start transition-all hover:border-line hover:bg-gold/5"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-gold/6 text-gold transition-transform duration-300 group-hover:scale-110">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-bold text-ink/85">{m.title}</span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-ink/45">{m.desc}</span>
                      </span>
                      <DirArrow size={13} className="shrink-0 text-gold opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* recent scan */}
          <div className="lux-card rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-ink/85">{tr.dash_recent_title}</p>
              {recent.length > 0 && (
                <span className="rounded-full border border-ok/40 bg-ok/8 px-2 py-0.5 font-mono text-[9px] text-ok" dir="ltr">
                  {num(recent.length, lang)}
                </span>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 text-[11px] leading-6 text-ink/45">{tr.dash_recent_empty}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-1.5">
                  {recent.map((r: ScannerEndpoint) => (
                    <li key={r.endpoint} className="flex items-center justify-between gap-3 rounded-xl border border-line-soft px-3.5 py-2">
                      <span className="conf-code text-[11px] text-ink/80" dir="ltr">
                        {r.endpoint}
                      </span>
                      <span className="font-mono text-[10px] text-ok" dir="ltr">
                        {r.serverMs !== null ? `${r.serverMs}ms` : r.localMs !== null ? `~${r.localMs}ms` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      useScannerBridge.getState().pick(recent[0]);
                      navigate("generator");
                    }}
                    className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
                  >
                    <KeyRound size={11} />
                    {tr.dash_recent_use}
                  </button>
                  <button
                    onClick={() => navigate("scanner")}
                    className="flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-1.5 text-[11px] text-ink/55 transition-colors hover:text-ink/85"
                  >
                    <Radar size={11} />
                    {tr.dash_recent_open}
                  </button>
                </div>
              </>
            )}
            {scanRunAt === null && recent.length === 0 && (
              <button
                onClick={() => navigate("scanner")}
                className="btn-ghost-lux mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
              >
                <Radar size={11} />
                {tr.dash_recent_open}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======== features ======== */}
      <Reveal className="mt-12">
        <h2 className="text-center font-display text-[22px] text-ink">{tr.feat_title}</h2>
      </Reveal>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={i} delay={(i % 3) * 70}>
              <div className="lux-card group h-full rounded-2xl p-5 transition-colors duration-400 hover:border-line-strong">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-gold/6 text-gold transition-transform duration-400 group-hover:scale-110">
                  <Icon size={16} />
                </span>
                <h3 className="mt-3.5 text-[13.5px] font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[11.5px] leading-6 text-ink/50">{f.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* ======== steps ======== */}
      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {[tr.how1_t, tr.how2_t, tr.how3_t].map((s, i) => (
          <Reveal key={i} delay={i * 90}>
            <div className="lux-card relative overflow-hidden rounded-2xl p-5 text-center">
              <span className="font-display text-[26px] text-gold/50">{num(i + 1, lang)}</span>
              <h3 className="mt-1 text-[14px] font-bold text-ink">{s}</h3>
              <p className="mt-1.5 text-[11px] leading-6 text-ink/50">
                {[tr.how1_d, tr.how2_d, tr.how3_d][i]}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ============================== LAB ============================== */
export function LabView() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const navigate = useAppView((s) => s.navigate);

  const roadmap = [
    { t: tr.r1_t, d: tr.r1_d, s: tr.r1_s, live: true },
    { t: tr.r2_t, d: tr.r2_d, s: tr.r2_s, live: true },
    { t: tr.r3_t, d: tr.r3_d, s: tr.r3_s, live: true },
    { t: tr.r4_t, d: tr.r4_d, s: tr.r4_s, live: false },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-10 pt-10 lg:px-8">
      <ViewHeading kicker={tr.lab_kicker} title={tr.lab_title} sub={tr.lab_sub} />

      {/* research report */}
      <Reveal className="mt-10">
        <div className="gold-edge lux-card-strong rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-gold/8 text-gold">
              <Lightbulb size={18} />
            </span>
            <div>
              <h2 className="text-[14.5px] font-bold text-ink">{tr.lab_find_title}</h2>
              <p className="mt-0.5 text-[11px] text-ink/45">{tr.lab_find_sub}</p>
            </div>
          </div>

          <ul className="mt-5 grid gap-2.5">
            {tr.lab_findings.map((f, i) => {
              const style =
                f.s === "ok"
                  ? { icon: <CheckCircle2 size={13} />, cls: "border-ok/35 bg-ok/8 text-ok" }
                  : f.s === "block"
                    ? { icon: <XCircle size={13} />, cls: "border-bad/35 bg-bad/8 text-bad" }
                    : f.s === "todo"
                      ? { icon: <RefreshCcw size={13} />, cls: "border-line-strong bg-gold/8 text-gold" }
                      : { icon: <Info size={13} />, cls: "border-line bg-ink/4 text-ink/60" };
              return (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-line-soft px-4 py-3">
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${style.cls}`}>
                    {style.icon}
                  </span>
                  <span className="text-[12px] leading-6 text-ink/70">{f.t}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-gold/5 px-4 py-3">
            <p className="text-[11.5px] leading-6 text-goldsoft">{tr.lab_verdict}</p>
            <button onClick={() => navigate("proxy")} className="btn-gold flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[11.5px]">
              <Send size={12} />
              {tr.nav_proxy}
            </button>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* research card */}
        <Reveal>
          <div className="gold-edge lux-card-strong h-full rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-gold/6 text-gold">
                  <FlaskConical size={19} />
                </span>
                <h2 className="max-w-[240px] text-[15.5px] font-bold leading-7 text-ink">{tr.lab_card_t}</h2>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-full border border-ok/40 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-ok">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" />
                {tr.lab_status_ok}
              </span>
            </div>

            <ol className="mt-6 space-y-0">
              {tr.lab_flow.map((step, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < tr.lab_flow.length - 1 && (
                    <span aria-hidden className="absolute start-[11px] top-6 h-full w-px bg-line" />
                  )}
                  <span className="relative z-10 mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border border-line-strong bg-panel font-mono text-[9px] text-gold">
                    {num(i + 1, lang)}
                  </span>
                  <span className="text-[12.5px] leading-6 text-ink/70">{step}</span>
                </li>
              ))}
            </ol>

            <p className="mt-4 border-t border-line pt-4 text-[11.5px] leading-6 text-ink/45">{tr.lab_note}</p>

            <div className="mt-4 rounded-xl border border-line-soft bg-gold/5 p-4">
              <p className="flex items-center gap-2 text-[12px] font-bold text-goldsoft">
                <Lightbulb size={13} />
                {tr.lab_privacy_title}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-ink/55">{tr.lab_privacy_text}</p>
            </div>

            <p className="mt-4 font-mono text-[9.5px] tracking-[0.2em] text-ink/35">{tr.lab_updated}</p>
          </div>
        </Reveal>

        {/* roadmap */}
        <Reveal delay={120}>
          <div className="lux-card h-full rounded-3xl p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-gold">{tr.r_title}</p>
            <ul className="mt-5">
              {roadmap.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-4 border-b border-ink/5 py-4 first:pt-0 last:border-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-bold text-ink/85">{r.t}</p>
                    <p className="mt-1.5 text-[11px] leading-6 text-ink/50">{r.d}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-wider ${
                      r.live ? "border-ok/40 text-ok" : "border-ink/15 text-ink/40"
                    }`}
                  >
                    {r.s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ============================== FAQ ============================== */
export function FaqView() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-10 lg:px-8">
      <ViewHeading kicker={tr.faq_kicker} title={tr.faq_title} />

      <div className="mt-8">
        <FaqList />
      </div>

      {/* trust buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => useStatusModalStore.getState().open("privacy")}
          className="btn-ghost-lux rounded-full px-5 py-2.5 text-[12.5px]"
        >
          <ShieldCheck size={13} className="me-2 inline" />
          {tr.privacy_title}
        </button>
        <button
          onClick={() => useStatusModalStore.getState().open("terms")}
          className="btn-ghost-lux rounded-full px-5 py-2.5 text-[12.5px]"
        >
          {tr.terms_title}
        </button>
      </div>
    </div>
  );
}
