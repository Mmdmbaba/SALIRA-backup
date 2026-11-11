"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  KeyRound,
  Sparkles,
  Radar,
  Crosshair,
  Languages,
  Blocks,
  ArrowUpRight,
  FlaskConical,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { Reveal } from "./background-fx";
import { MagneticLink } from "./magnetic";

/* ---------------- section heading ---------------- */
export function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="kicker justify-center">{kicker}</span>
      <h2 className="font-display mt-5 text-[30px] leading-snug text-ink sm:text-[38px]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[13.5px] leading-7 text-ink/55">{sub}</p>}
    </Reveal>
  );
}

/* ---------------- features: editorial numbered list ---------------- */
export function Features() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);

  const feats = [
    { icon: <KeyRound size={18} />, title: tr.f1_title, desc: tr.f1_desc },
    { icon: <Sparkles size={18} />, title: tr.f2_title, desc: tr.f2_desc },
    { icon: <Crosshair size={18} />, title: tr.f3_title, desc: tr.f3_desc },
    { icon: <Radar size={18} />, title: tr.f4_title, desc: tr.f4_desc },
    { icon: <Languages size={18} />, title: tr.f5_title, desc: tr.f5_desc },
    { icon: <Blocks size={18} />, title: tr.f6_title, desc: tr.f6_desc },
  ];

  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <SectionHeading kicker={tr.feat_kicker} title={tr.feat_title} sub={tr.feat_sub} />

        <div className="mt-16 grid gap-x-12 md:grid-cols-2 lg:gap-x-20">
          {feats.map((f, i) => (
            <Reveal key={i} delay={(i % 2) * 90} className="border-t border-line">
              <div className="group flex gap-5 py-8">
                <span className="font-display shrink-0 text-[15px] text-gold/70" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-gold transition-transform duration-500 group-hover:scale-110">
                      {f.icon}
                    </span>
                    <h3 className="text-[15.5px] font-bold text-ink">{f.title}</h3>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-7 text-ink/55">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- how it works ---------------- */
export function HowItWorks() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);

  const steps = [
    { t: tr.how1_t, d: tr.how1_d },
    { t: tr.how2_t, d: tr.how2_d },
    { t: tr.how3_t, d: tr.how3_d },
  ];

  return (
    <section className="relative border-y border-line-soft bg-ink/2 py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <SectionHeading kicker={tr.how_kicker} title={tr.how_title} />

        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          {/* connecting hairline */}
          <div aria-hidden className="absolute inset-x-16 top-5 hidden h-px bg-gradient-to-l from-transparent via-gold/30 to-transparent md:block" />

          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 120} className="relative">
              <div className="text-center md:text-start">
                <span className="font-display relative z-10 inline-grid h-10 w-10 place-items-center rounded-full border border-line-hi bg-panel text-[15px] text-goldsoft">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[15.5px] font-bold text-ink">{s.t}</h3>
                <p className="mt-2.5 text-[13px] leading-7 text-ink/55">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- laboratory + roadmap ---------------- */
export function ResearchLab() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);

  const roadmap = [
    { t: tr.r1_t, d: tr.r1_d, s: tr.r1_s, live: true },
    { t: tr.r2_t, d: tr.r2_d, s: tr.r2_s, live: true },
    { t: tr.r3_t, d: tr.r3_d, s: tr.r3_s, live: false },
    { t: tr.r4_t, d: tr.r4_d, s: tr.r4_s, live: false },
  ];

  return (
    <section id="lab" className="relative scroll-mt-20 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <span id="roadmap" className="sr-only">roadmap</span>
        <SectionHeading kicker={tr.lab_kicker} title={tr.lab_title} sub={tr.lab_sub} />

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* lab card */}
          <Reveal>
            <div className="gold-edge lux-card-strong h-full rounded-3xl p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-gold/8 text-gold">
                    <FlaskConical size={19} />
                  </span>
                  <h3 className="max-w-[240px] text-[16px] font-bold leading-7 text-ink">
                    {tr.lab_card_t}
                  </h3>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 font-mono text-[9.5px] tracking-[0.2em] text-gold">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-gold" />
                  {tr.lab_status}
                </span>
              </div>

              <ol className="mt-6 space-y-0">
                {tr.lab_flow.map((step, i) => (
                  <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* connector */}
                    {i < tr.lab_flow.length - 1 && (
                      <span aria-hidden className="absolute start-[11px] top-6 h-full w-px bg-gold/20" />
                    )}
                    <span className="relative z-10 mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border border-line-strong bg-panel font-mono text-[9px] text-gold">
                      {i + 1}
                    </span>
                    <span className="text-[12.5px] leading-6 text-ink/70">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/8 px-3 py-1.5 text-[10.5px] text-ok">
                  <CheckCircle2 size={11} />
                  {tr.lab_status_ok}
                </span>
              </div>

              <p className="mt-5 border-t border-line pt-5 text-[11.5px] leading-6 text-ink/45">
                {tr.lab_note}
              </p>

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
            <div className="lux-card h-full rounded-3xl p-7">
              <p className="font-mono text-[10px] tracking-[0.3em] text-gold">{tr.r_title}</p>
              <ul className="mt-6 space-y-0">
                {roadmap.map((r, i) => (
                  <li
                    key={i}
                    className="group flex items-start justify-between gap-4 border-b border-ink/5 py-4 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink/85">
                        {r.t}
                        <ArrowUpRight
                          size={13}
                          className="text-gold opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-6 text-ink/50">{r.d}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-wider ${
                        r.live
                          ? "border-ok/40 text-ok"
                          : "border-ink/15 text-ink/40"
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
    </section>
  );
}

/* ---------------- FAQ ---------------- */
export function Faq() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  return (
    <section id="faq" className="relative border-t border-line-soft py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <SectionHeading kicker={tr.faq_kicker} title={tr.faq_title} />
        <div className="mt-14">
          <FaqList />
        </div>
      </div>
    </section>
  );
}

/** Accordion only — used by the SPA FAQ view. */
export function FaqList() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    { q: tr.faq_q1, a: tr.faq_a1 },
    { q: tr.faq_q2, a: tr.faq_a2 },
    { q: tr.faq_q3, a: tr.faq_a3 },
    { q: tr.faq_q4, a: tr.faq_a4 },
    { q: tr.faq_q5, a: tr.faq_a5 },
  ];

  return (
    <div className="space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 60}>
                <div
                  className={`lux-card overflow-hidden rounded-2xl transition-colors duration-500 ${
                    isOpen ? "border-line-strong" : ""
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-trigger-${i}`}
                  >
                    <span className={`text-[14px] font-bold transition-colors ${isOpen ? "text-goldsoft" : "text-ink/85"}`}>
                      {item.q}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-gold transition-transform duration-400 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-line-soft px-6 pb-6 pt-4 text-[13px] leading-8 text-ink/60">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
    </div>
  );
}

/* ---------------- big CTA ---------------- */
export function BigCta() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <Reveal>
          <div className="gold-edge relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#181410] to-[#0e0c09] px-8 py-16 text-center">
            {/* warm glow */}
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[420px] -translate-x-1/2 rounded-full bg-gold/20 blur-2xl" />

            <h2 className="font-display relative text-[30px] leading-snug text-ink sm:text-[38px]">
              {tr.cta_title}
            </h2>
            <p className="relative mt-4 text-[13.5px] text-ink/55">{tr.cta_sub}</p>
            <div className="relative mt-9">
              <MagneticLink href="#generator" className="btn-gold inline-flex rounded-full px-9 py-4 text-[15px]">
                {tr.cta_btn}
              </MagneticLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
