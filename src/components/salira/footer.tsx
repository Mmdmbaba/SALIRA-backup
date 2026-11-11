"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { Reveal } from "./background-fx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function Footer() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);

  const toolLinks = [
    { label: tr.nav_generator, href: "#generator" },
    { label: tr.nav_scanner, href: "#scanner" },
    { label: tr.nav_features, href: "#features" },
    { label: tr.nav_faq, href: "#faq" },
  ];

  const projectLinks = [
    { label: tr.lab_kicker, href: "#lab" },
    { label: tr.r_title, href: "#roadmap" },
    { label: tr.cta_title, href: "#generator" },
  ];

  const resourceLinks = [
    {
      label: tr.footer_source,
      href: "https://github.com/x4gpanell/Amnezia-Wg",
      desc: tr.footer_source_desc,
    },
    {
      label: "AmneziaWG",
      href: "https://github.com/amnezia-vpn/amnezia-wg",
      desc: tr.rel_amnezia,
    },
    {
      label: "WireGuard",
      href: "https://wireguard.com",
      desc: tr.rel_wg,
    },
  ];

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr_repeat(3,0.6fr)]">
          <Reveal>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[22px] tracking-[0.34em] text-ink">SALIRA</span>
                <span aria-hidden className="h-4 w-px bg-line-strong" />
                <span aria-hidden className="pulse-dot h-1.5 w-1.5 rounded-full bg-gold" />
              </div>
              <p className="mt-5 max-w-xs text-[12.5px] leading-7 text-ink/50">{tr.footer_tagline}</p>
            </div>
          </Reveal>

          <Reveal delay={0}>
            <div>
              <p className="font-mono text-[10px] tracking-[0.28em] text-gold">{tr.footer_col_tool}</p>
              <ul className="mt-5 space-y-3">
                {toolLinks.map((l, j) => (
                  <li key={j}>
                    <a href={l.href} className="nav-link text-[12.5px] text-ink/60">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div>
              <p className="font-mono text-[10px] tracking-[0.28em] text-gold">{tr.footer_col_project}</p>
              <ul className="mt-5 space-y-3">
                {projectLinks.map((l, j) => (
                  <li key={j}>
                    <a href={l.href} className="nav-link text-[12.5px] text-ink/60">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <button onClick={() => setModal("privacy")} className="nav-link text-[12.5px] text-ink/60">
                    {tr.privacy_title}
                  </button>
                </li>
                <li>
                  <button onClick={() => setModal("terms")} className="nav-link text-[12.5px] text-ink/60">
                    {tr.terms_title}
                  </button>
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div>
              <p className="font-mono text-[10px] tracking-[0.28em] text-gold">{tr.footer_col_note}</p>
              <ul className="mt-5 space-y-4">
                {resourceLinks.map((l, j) => (
                  <li key={j}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="nav-link block text-[12.5px] text-ink/60"
                    >
                      {l.label}
                    </a>
                    <p className="mt-1 text-[10px] leading-4 text-ink/35">{l.desc}</p>
                  </li>
                ))}
                <li>
                  <span className="block text-[12.5px] text-ink/60">{tr.footer_license}</span>
                  <p className="mt-1 text-[10px] leading-4 text-ink/35">{tr.footer_license_desc}</p>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>

        <p className="mt-14 border-t border-line-soft pt-6 text-[11px] leading-6 text-ink/35">
          {tr.footer_legal_note}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] text-ink/40">{tr.footer_credit}</p>
          <p className="font-mono text-[10.5px] tracking-[0.2em] text-ink/35">{tr.footer_rights}</p>
        </div>
      </div>

      {/* giant wordmark */}
      <div aria-hidden className="select-none overflow-hidden pb-2">
        <p className="font-display text-center text-[22vw] leading-[0.85] tracking-[0.08em] text-ink/[0.035] lg:text-[240px]">
          SALIRA
        </p>
      </div>

      {/* privacy / terms dialog */}
      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="border-line bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[19px] tracking-wide text-goldsoft">
              {modal === "privacy" ? tr.privacy_title : tr.terms_title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {modal === "privacy" ? tr.privacy_title : tr.terms_title}
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-[50vh] overflow-y-auto text-[13px] leading-8 text-ink/65">
            {modal === "privacy" ? tr.privacy_body : tr.terms_body}
          </p>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
