"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  KeyRound,
  Server,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  QrCode,
  ExternalLink,
  Play,
  Square,
  RefreshCcw,
  AlertTriangle,
  Info,
  Clock3,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { num } from "@/lib/fa";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ease = [0.22, 1, 0.36, 1] as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TLS_DOMAINS = ["cdn.jsdelivr.net", "www.cloudflare.com", "tools.ietf.org"];

interface KataServer {
  id: string;
  name: string;
  ip: string | null;
  port: number | null;
  state: string;
}

interface DeployResult {
  ip: string;
  port: number;
  secret: string;
  tlsDomain: string;
  name?: string;
  links: { ee: string; dd: string; eeShare: string; ddShare: string };
}

type StageState = "wait" | "run" | "done" | "fail";
const STAGE_COUNT = 5;

export function ProxyWizard() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState(false);

  /* connect step */
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [finding, setFinding] = useState(false);
  const [findErr, setFindErr] = useState("");
  const [servers, setServers] = useState<KataServer[]>([]);
  const [selId, setSelId] = useState<string | null>(null);

  /* deploy step */
  const [tlsDomain, setTlsDomain] = useState(TLS_DOMAINS[0]);
  const [stages, setStages] = useState<StageState[]>(Array(STAGE_COUNT).fill("wait"));
  const [deploying, setDeploying] = useState(false);
  const [deployErr, setDeployErr] = useState("");

  /* result */
  const [result, setResult] = useState<DeployResult | null>(null);
  const [power, setPower] = useState<"running" | "stopped">("running");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState("");

  const selServer = useMemo(() => servers.find((s) => s.id === selId) ?? null, [servers, selId]);

  const mapErr = useCallback(
    (code: string): string => {
      const m: Record<string, string> = {
        auth: tr.px_bad_key,
        notfound: tr.px_err_notfound,
        network: tr.px_err_panel,
        panel: tr.px_err_panel,
        rate_limited: tr.err_rate,
        deploy: tr.px_err_deploy,
      };
      return m[code] ?? tr.px_err_deploy;
    },
    [tr]
  );

  const kata = useCallback(
    async (body: Record<string, unknown>): Promise<{ ok: boolean; code?: string } & Record<string, unknown>> => {
      if (demo) {
        await sleep(700);
        return { ok: true };
      }
      const res = await fetch("/api/proxy/kata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as { ok: boolean; code?: string } & Record<string, unknown>;
    },
    [demo]
  );

  /* ------------------------------ actions ------------------------------ */
  const findServers = async () => {
    if (demo) {
      setFinding(true);
      await sleep(900);
      setServers([
        { id: "demo1", name: "proxy", ip: "51.75.118.79", port: 20364, state: "running" },
        { id: "demo2", name: "python-2", ip: "51.75.118.79", port: 20365, state: "stopped" },
      ]);
      setSelId("demo1");
      setFinding(false);
      setFindErr("");
      return;
    }
    const key = apiKey.trim();
    if (key.length < 10) {
      setFindErr(tr.px_bad_key);
      return;
    }
    setFinding(true);
    setFindErr("");
    try {
      const data = await kata({ action: "list", apiKey: key });
      if (!data.ok) {
        setFindErr(mapErr(data.code ?? "panel"));
        setServers([]);
        return;
      }
      const list = (data.servers as KataServer[]) ?? [];
      setServers(list);
      if (list.length === 0) setFindErr(tr.px_no_servers);
      else setSelId(list[0].id);
    } catch {
      setFindErr(tr.px_err_panel);
    } finally {
      setFinding(false);
    }
  };

  const markStage = (i: number, st: StageState) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? st : s)));

  const deploy = async () => {
    if (!selServer && !demo) return;
    setDeploying(true);
    setDeployErr("");
    setStages(Array(STAGE_COUNT).fill("wait"));

    const fakeResult = (): DeployResult => {
      const secret = [...crypto.getRandomValues(new Uint8Array(16))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const ip = "51.75.118.79";
      const port = 20364;
      const hex = (s: string) =>
        [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const ee = `ee${secret}${hex(tlsDomain)}`;
      const dd = `dd${secret}`;
      return {
        ip,
        port,
        secret,
        tlsDomain,
        name: selServer?.name ?? "demo",
        links: {
          ee: `tg://proxy?server=${ip}&port=${port}&secret=${ee}`,
          dd: `tg://proxy?server=${ip}&port=${port}&secret=${dd}`,
          eeShare: `https://t.me/proxy?server=${ip}&port=${port}&secret=${ee}`,
          ddShare: `https://t.me/proxy?server=${ip}&port=${port}&secret=${dd}`,
        },
      };
    };

    try {
      /* stage 1 — server details (already known from list) */
      markStage(0, "run");
      await sleep(demo ? 600 : 250);
      markStage(0, "done");

      /* stage 2 — PY_PACKAGES=cryptography */
      markStage(1, "run");
      const r2 = await kata({ action: "setvar", apiKey: apiKey.trim(), serverId: selId ?? "" });
      if (!r2.ok) throw (r2.code ?? "deploy");
      markStage(1, "done");

      /* stage 3+4 — upload core + write config (one request) */
      markStage(2, "run");
      let res: DeployResult;
      if (demo) {
        await sleep(1400);
        markStage(2, "done");
        markStage(3, "run");
        await sleep(700);
        res = fakeResult();
      } else {
        const r3 = await kata({ action: "write", apiKey: apiKey.trim(), serverId: selId, tlsDomain });
        if (!r3.ok) throw (r3.code ?? "deploy");
        markStage(2, "done");
        markStage(3, "run");
        await sleep(300);
        res = r3 as unknown as DeployResult;
      }
      markStage(3, "done");
      setResult(res);

      /* stage 5 — start + poll */
      markStage(4, "run");
      if (demo) {
        await sleep(1600);
      } else {
        await kata({ action: "power", apiKey: apiKey.trim(), serverId: selId, signal: "restart" });
        const deadline = Date.now() + 52_000;
        let state = "";
        while (Date.now() < deadline) {
          await sleep(2600);
          const rp = await kata({ action: "poll", apiKey: apiKey.trim(), serverId: selId });
          state = String(rp.state ?? "");
          if (state === "running") break;
        }
        if (state !== "running") throw "deploy";
      }
      markStage(4, "done");
      setPower("running");
      setStep(3);
    } catch (e) {
      const code = typeof e === "string" ? e : "deploy";
      setDeployErr(mapErr(code));
      setStages((prev) => prev.map((s) => (s === "run" ? "fail" : s)));
    } finally {
      setDeploying(false);
    }
  };

  const doPower = async (signal: "stop" | "start") => {
    try {
      if (!demo) {
        const r = await kata({ action: "power", apiKey: apiKey.trim(), serverId: selId, signal });
        if (!r.ok) throw (r.code ?? "panel");
      }
      setPower(signal === "stop" ? "stopped" : "running");
      toast({ title: signal === "stop" ? tr.px_power_stopped : tr.px_power_started });
    } catch (e) {
      toast({ title: mapErr(typeof e === "string" ? e : "panel"), variant: "destructive" });
    }
  };

  const showQr = async (link: string) => {
    try {
      const QR = await import("qrcode");
      const url = await QR.toDataURL(link, {
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

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: msg });
    } catch {
      /* ignore */
    }
  };

  const canNext = [true, demo || (!!selId && servers.length > 0), !deploying, true][step];

  /* ------------------------------ stage list ------------------------------ */
  const stageLabels = [tr.px_stage_1, tr.px_stage_2, tr.px_stage_3, tr.px_stage_4, tr.px_stage_5];

  /* ------------------------------ render ------------------------------ */
  const steps = [tr.px_tab1, tr.px_tab2, tr.px_tab3, tr.px_tab4];
  const dirSign = lang === "fa" ? -1 : 1;

  return (
    <div className="mx-auto max-w-4xl">
      {/* wizard tab bar */}
      <div className="lux-card rounded-2xl p-1.5" role="tablist" aria-label={tr.px_kicker}>
        <div className="grid grid-cols-4 gap-1">
          {steps.map((label, i) => {
            const active = step === i;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={active}
                onClick={() => setStep(i)}
                className={`relative flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gold/60 ${
                  active ? "text-gold" : "text-ink/45 hover:text-ink/80"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="px-tab-active"
                    className="absolute inset-0 rounded-xl border border-line-strong bg-gold/12"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 font-mono text-[10px]">{num(i + 1, lang)}</span>
                <span className="relative z-10 truncate text-[11px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 18 * dirSign }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 * dirSign }}
          transition={{ duration: 0.3, ease }}
          className="mt-3"
        >
          {/* =================== step 0 · guide =================== */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="gold-edge lux-card-strong rounded-3xl p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-gold/8 text-gold">
                    <Send size={18} />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-bold text-ink">{tr.px_intro_title}</h2>
                    <p className="mt-2 text-[12.5px] leading-7 text-ink/60">{tr.px_intro_body}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[tr.px_need_1, tr.px_need_2, tr.px_need_3].map((n, i) => (
                    <div key={i} className="rounded-xl border border-line-soft bg-ink/4 px-4 py-3">
                      <span className="font-mono text-[10px] text-gold">{num(i + 1, lang)}</span>
                      <p className="mt-1 text-[11.5px] leading-6 text-ink/70">{n}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[10.5px] text-ink/55">
                    <Clock3 size={11} className="text-gold" />
                    {tr.px_time}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-ok/35 bg-ok/8 px-3 py-1.5 text-[10.5px] text-ok">
                    <ShieldCheck size={11} />
                    {tr.px_privacy_note}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-line bg-ink/4 px-3 py-1.5 text-[10.5px] text-ink/55">
                    <Info size={11} />
                    {tr.px_tos_note}
                  </span>
                </div>
                <p className="mt-3 rounded-xl bg-gold/6 px-4 py-3 text-[11px] leading-6 text-goldsoft">
                  <Lock size={11} className="me-1.5 inline" />
                  {tr.px_need_note}
                </p>
              </div>

              {/* pictorial guide */}
              <div className="lux-card rounded-3xl p-6">
                <h3 className="text-[14px] font-bold text-ink">{tr.px_guide_title}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { t: tr.px_g1_t, d: tr.px_g1_d, img: "/guide/research_katabump_register.png" },
                    { t: tr.px_g2_t, d: tr.px_g2_d, img: null },
                    { t: tr.px_g3_t, d: tr.px_g3_d, img: null },
                    { t: tr.px_g4_t, d: tr.px_g4_d, img: "/guide/files_page.png" },
                  ].map((g, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-line-soft">
                      {g.img ? (
                        <img src={g.img} alt={g.t} loading="lazy" className="h-36 w-full border-b border-line-soft object-cover object-top" />
                      ) : (
                        <div className="grid h-36 w-full place-items-center border-b border-line-soft bg-gold/4">
                          <span className="font-display text-[34px] text-gold/40">{num(i + 1, lang)}</span>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
                          <span className="grid h-5 w-5 place-items-center rounded-full border border-line-strong font-mono text-[9px] text-gold">
                            {num(i + 1, lang)}
                          </span>
                          {g.t}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-6 text-ink/50">{g.d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href="https://dashboard.katabump.com/auth/register"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px]"
                  >
                    <ExternalLink size={13} />
                    {tr.px_open_kata}
                  </a>
                  <button
                    onClick={() => {
                      setDemo(true);
                      setStep(1);
                    }}
                    className="btn-ghost-lux inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px]"
                  >
                    <Play size={13} />
                    {tr.px_demo}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================== step 1 · connect =================== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="lux-card rounded-3xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                    <KeyRound size={15} className="text-gold" />
                    {tr.px_key_label}
                  </h2>
                  {demo && (
                    <span className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-gold">
                      <Play size={10} />
                      {tr.px_demo_badge}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      dir="ltr"
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setFindErr("");
                      }}
                      placeholder={tr.px_key_ph}
                      aria-label={tr.px_key_label}
                      autoComplete="off"
                      className="conf-code h-11 w-full rounded-xl border border-line bg-ink/5 pe-10 ps-4 text-[12.5px] text-ink/85 placeholder:text-ink/30"
                    />
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      aria-label={showKey ? "hide" : "show"}
                      className="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink/40 transition-colors hover:text-gold"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    onClick={findServers}
                    disabled={finding || (!demo && apiKey.trim().length < 10)}
                    className="btn-gold flex h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {finding ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                    {finding ? tr.px_finding : tr.px_find}
                  </button>
                </div>
                <p className="mt-2.5 text-[10.5px] text-ink/40">{tr.px_key_hint}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ok">
                  <ShieldCheck size={11} />
                  {tr.px_privacy_note}
                </p>
                {findErr && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/8 px-4 py-2.5 text-[11.5px] text-bad" role="alert">
                    <AlertTriangle size={13} />
                    {findErr}
                  </p>
                )}
              </div>

              {servers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lux-card rounded-3xl p-6">
                  <h3 className="text-[13.5px] font-bold text-ink">{tr.px_pick_title}</h3>
                  <p className="mt-1 text-[11px] leading-6 text-ink/45">{tr.px_pick_note}</p>
                  <div className="mt-4 grid gap-2">
                    {servers.map((s) => {
                      const active = selId === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelId(s.id)}
                          aria-pressed={active}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-all duration-300 ${
                            active ? "border-line-hi bg-gold/10" : "border-ink/10 hover:border-line-strong"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className={`grid h-9 w-9 place-items-center rounded-xl border ${active ? "border-gold/40 bg-gold/10 text-gold" : "border-line bg-ink/4 text-ink/50"}`}>
                              <Server size={15} />
                            </span>
                            <span>
                              <span className="block text-[12.5px] font-bold text-ink/85">{s.name}</span>
                              <span className="conf-code mt-0.5 block text-[10.5px] text-ink/45" dir="ltr">
                                {s.ip ? `${s.ip}:${s.port}` : "—"}
                              </span>
                            </span>
                          </span>
                          <span
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-wider ${
                              s.state === "running" ? "border-ok/40 text-ok" : "border-ink/15 text-ink/40"
                            }`}
                            dir="ltr"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${s.state === "running" ? "bg-ok" : "bg-ink/30"}`} />
                            {s.state}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* =================== step 2 · deploy =================== */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="lux-card rounded-3xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                    <Server size={15} className="text-gold" />
                    {selServer ? selServer.name : "—"}
                  </h2>
                  {selServer?.ip && (
                    <span className="conf-code rounded-lg border border-line bg-ink/4 px-3 py-1.5 text-[11px] text-ink/70" dir="ltr">
                      {selServer.ip}:{selServer.port}
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[11.5px] font-bold text-ink/60">{tr.px_tls_label}</p>
                  <div className="flex flex-wrap gap-2">
                    {TLS_DOMAINS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setTlsDomain(d)}
                        aria-pressed={tlsDomain === d}
                        className={`conf-code rounded-full border px-3.5 py-1.5 text-[11px] transition-all duration-300 ${
                          tlsDomain === d ? "border-line-hi bg-gold/12 text-goldsoft" : "border-ink/10 text-ink/55 hover:border-line-strong"
                        }`}
                        dir="ltr"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10.5px] text-ink/40">{tr.px_tls_note}</p>
                </div>

                <button
                  onClick={deploy}
                  disabled={deploying}
                  className="btn-gold mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-[14px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deploying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {tr.px_deploying}
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      {tr.px_deploy}
                    </>
                  )}
                </button>
                {deploying && <p className="mt-2 text-center text-[10.5px] text-ink/40">{tr.px_stage_wait}</p>}
                {deployErr && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/8 px-4 py-2.5 text-[11.5px] text-bad" role="alert">
                    <AlertTriangle size={13} />
                    {deployErr}
                  </p>
                )}
              </div>

              {/* live stages */}
              <div className="lux-card rounded-3xl p-6">
                <ol className="space-y-2.5">
                  {stageLabels.map((label, i) => {
                    const st = stages[i];
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300 ${
                          st === "done"
                            ? "border-ok/30 bg-ok/5"
                            : st === "run"
                              ? "border-gold/40 bg-gold/8"
                              : st === "fail"
                                ? "border-bad/35 bg-bad/8"
                                : "border-line-soft opacity-50"
                        }`}
                      >
                        {st === "done" ? (
                          <CheckCircle2 size={16} className="shrink-0 text-ok" />
                        ) : st === "run" ? (
                          <Loader2 size={16} className="shrink-0 animate-spin text-gold" />
                        ) : st === "fail" ? (
                          <XCircle size={16} className="shrink-0 text-bad" />
                        ) : (
                          <span className="h-4 w-4 shrink-0 rounded-full border border-line-strong" />
                        )}
                        <span className="text-[12px] text-ink/75">{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {/* =================== step 3 · delivery =================== */}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="gold-edge lux-card-strong rounded-3xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-ok/40 bg-ok/10 text-ok">
                      <CheckCircle2 size={20} />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-bold text-ink">{tr.px_result_title}</h2>
                      <p className="mt-0.5 text-[11.5px] text-ink/50">{tr.px_result_sub}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {demo && (
                      <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-gold">
                        {tr.px_demo_badge}
                      </span>
                    )}
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] ${
                        power === "running" ? "border-ok/40 text-ok" : "border-bad/35 text-bad"
                      }`}
                      dir="ltr"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${power === "running" ? "bg-ok pulse-dot" : "bg-bad"}`} />
                      {result.ip}:{result.port}
                    </span>
                  </div>
                </div>

                {/* links */}
                <div className="mt-5 space-y-2.5">
                  {(
                    [
                      { label: tr.px_link_ee, value: result.links.ee, share: result.links.eeShare, tone: "gold" },
                      { label: tr.px_link_dd, value: result.links.dd, share: result.links.ddShare, tone: "ghost" },
                    ] as const
                  ).map((l) => (
                    <div
                      key={l.label}
                      className={`rounded-2xl border p-4 ${l.tone === "gold" ? "border-gold/35 bg-gold/6" : "border-line-soft bg-ink/4"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[11.5px] font-bold ${l.tone === "gold" ? "text-gold" : "text-ink/55"}`}>{l.label}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyText(l.value, tr.copied)}
                            className="btn-ghost-lux flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
                          >
                            <Copy size={11} />
                            {tr.px_copy_link}
                          </button>
                          {l.tone === "gold" && (
                            <button
                              onClick={() => showQr(l.share)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold transition-colors hover:border-line-hi"
                              aria-label={tr.qr_title}
                            >
                              <QrCode size={13} />
                            </button>
                          )}
                          <a
                            href={l.share}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold transition-colors hover:border-line-hi"
                            aria-label="open in telegram"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                      <p className="conf-code mt-2 break-all text-[10.5px] leading-5 text-ink/60" dir="ltr">
                        {l.value}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 flex items-start gap-2 rounded-xl bg-bad/8 px-4 py-3 text-[11px] leading-6 text-bad">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  {tr.px_keep_private}
                </p>
              </div>

              {/* how-to + power */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="lux-card rounded-3xl p-6">
                  <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    <Lightbulb size={14} className="text-gold" />
                    {tr.px_how_title}
                  </h3>
                  <ol className="mt-3 space-y-2.5">
                    {[tr.px_how_1, tr.px_how_2, tr.px_how_3].map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[11.5px] leading-6 text-ink/60">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[9px] text-gold">
                          {num(i + 1, lang)}
                        </span>
                        {h}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="lux-card rounded-3xl p-6">
                  <h3 className="text-[13px] font-bold text-ink">{tr.nav_proxy}</h3>
                  <div className="mt-3 grid gap-2">
                    {power === "running" ? (
                      <button
                        onClick={() => doPower("stop")}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-bad/40 px-4 text-[12px] text-bad transition-all hover:bg-bad/8"
                      >
                        <Square size={13} />
                        {tr.px_power_stop}
                      </button>
                    ) : (
                      <button
                        onClick={() => doPower("start")}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-ok/40 px-4 text-[12px] text-ok transition-all hover:bg-ok/8"
                      >
                        <Play size={13} />
                        {tr.px_power_start}
                      </button>
                    )}
                    <button onClick={deploy} disabled={deploying} className="btn-ghost-lux flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[12px] disabled:opacity-50">
                      <RefreshCcw size={13} />
                      {tr.px_new_secret}
                    </button>
                    <button
                      onClick={() => {
                        setStep(1);
                        setResult(null);
                        setStages(Array(STAGE_COUNT).fill("wait"));
                      }}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 text-[12px] text-ink/55 transition-colors hover:text-ink/85"
                    >
                      <Server size={13} />
                      {tr.px_again}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && !result && (
            <div className="lux-card grid h-48 place-items-center rounded-3xl">
              <p className="text-[12px] text-ink/45">{tr.px_result_sub}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* wizard footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          disabled={step === 0}
          className="btn-ghost-lux flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lang === "fa" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {tr.px_prev}
        </button>
        {step === 1 && !demo && servers.length === 0 && (
          <span className="hidden items-center gap-1.5 text-[11px] text-ink/40 sm:flex">
            <ShieldOff size={12} />
            {tr.px_key_hint}
          </span>
        )}
        {canNext && step < 3 && (
          <button
            onClick={() => setStep((v) => Math.min(3, v + 1))}
            disabled={step === 1 && !canNext}
            className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px]"
          >
            {tr.px_next}
            {lang === "fa" ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {step === 3 && <span aria-hidden className="hidden w-[104px] sm:block" />}
      </div>

      {/* QR dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="border-line bg-popover sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px] tracking-wide text-goldsoft">{tr.qr_title}</DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="space-y-4 pb-2">
              <img src={qrData} alt={tr.qr_title} className="mx-auto w-full max-w-[320px] rounded-2xl" />
              <p className="text-center text-[12px] text-ink/55">{tr.px_result_sub}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
