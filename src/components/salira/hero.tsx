"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ScanLine, FileCheck2 } from "lucide-react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { MagneticLink } from "./magnetic";
import { Reveal } from "./background-fx";

const SAMPLE_CONF = `[Interface]
PrivateKey = ····························=
Address = 172.16.0.2/32, 2606:4700:110::/128
DNS = 1.1.1.1, 1.0.0.1
MTU = 1280
Jc = 4 | Jmin = 12 | Jmax = 38
H1–H4 = ✔ scrambled

[Peer]
PublicKey = bmXOC+F1FxEMF9dy…=
Endpoint = 188.114.96.1:2408
AllowedIPs = 0.0.0.0/0, ::/0`;

export function Hero() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const [lines, setLines] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);

  // typewriter over the sample config
  useEffect(() => {
    if (lineIdx >= SAMPLE_CONF.split("\n").length) {
      const reset = setTimeout(() => {
        setLines([]);
        setLineIdx(0);
      }, 5200);
      return () => clearTimeout(reset);
    }
    const target = SAMPLE_CONF.split("\n")[lineIdx];
    let ch = 0;
    const iv = setInterval(() => {
      ch += 3;
      const slice = target.slice(0, ch);
      setLines((prev) => {
        const next = [...prev];
        next[lineIdx] = slice;
        return next;
      });
      if (ch >= target.length) {
        clearInterval(iv);
        setLineIdx((i) => i + 1);
      }
    }, 26);
    return () => clearInterval(iv);
  }, [lineIdx]);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section id="top" className="relative overflow-hidden pb-10 pt-36 lg:pt-44">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        {/* ------------------------------- copy ------------------------------- */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
          >
            <span className="kicker">{tr.hero_kicker}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.08, ease }}
            className="font-display mt-6 text-[42px] leading-[1.14] text-ink sm:text-[56px] lg:text-[64px]"
          >
            {tr.hero_title_1}{" "}
            <span className="gold-gradient-text">{tr.hero_title_2}</span>
            <br />
            {tr.hero_title_3}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.16, ease }}
            className="mt-6 max-w-xl text-[15px] leading-8 text-ink/60"
          >
            {tr.hero_sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.24, ease }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <MagneticLink href="#generator" className="btn-gold inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[14.5px]">
              <FileCheck2 size={16} />
              {tr.hero_cta_primary}
            </MagneticLink>
            <MagneticLink href="#scanner" className="btn-ghost-lux inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[14.5px]">
              <ScanLine size={16} />
              {tr.hero_cta_secondary}
            </MagneticLink>
          </motion.div>

          {/* stats */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6"
          >
            {[
              [tr.hero_stat_1_v, tr.hero_stat_1],
              [tr.hero_stat_2_v, tr.hero_stat_2],
              [tr.hero_stat_3_v, tr.hero_stat_3],
            ].map(([v, k], i) => (
              <div key={i}>
                <dt className="font-display text-[26px] leading-none text-goldsoft">{v}</dt>
                <dd className="mt-2 text-[11px] leading-5 text-ink/45">{k}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* --------------------------- conf card ----------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease }}
          className="relative"
        >
          {/* floating chip */}
          <div className="float-y absolute -top-6 end-6 z-10 hidden items-center gap-2 rounded-full border border-line-strong bg-[#14110d]/90 px-4 py-2 backdrop-blur-md sm:flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8fbf9f]" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-ok">
              {tr.hero_card_badge}
            </span>
          </div>

          <div className="gold-edge lux-card-strong relative overflow-hidden rounded-3xl p-1">
            <div className="rounded-[20px] p-6">
              {/* card header */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d98a7a]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8fbf9f]/70" />
                </div>
                <span className="conf-code text-[11px] text-ink/40">
                  {tr.hero_card_title}
                </span>
              </div>

              {/* conf body */}
              <div className="conf-code mt-5 h-[240px] overflow-hidden text-[11.5px] text-ink/80">
                {lines.map((l, i) => (
                  <div key={i} className={i === lineIdx ? "caret" : ""}>
                    {l || "\u00A0"}
                  </div>
                ))}
              </div>

              {/* card footer */}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="text-[11px] text-ink/45">{tr.hero_card_status}</span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-gold">
                  SALIRA · v2.0
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* scroll hint */}
      <Reveal className="mt-14 flex justify-center">
        <a href="#generator" aria-label="scroll" className="text-gold/60 transition-colors hover:text-goldsoft">
          <ArrowDown size={18} />
        </a>
      </Reveal>
    </section>
  );
}

/** Elegant thin protocol ticker under the hero. */
export function Ticker() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const items = tr.ticker_items;
  return (
    <div className="relative overflow-hidden border-y border-line-soft py-3.5">
      <div className="ticker-track">
        {[0, 1].map((k) => (
          <span key={k} className="whitespace-nowrap pe-8 font-mono text-[10.5px] tracking-[0.3em] text-ink/35">
            {items}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 start-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
