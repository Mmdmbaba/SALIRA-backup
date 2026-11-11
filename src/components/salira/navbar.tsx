"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { withBase } from "@/lib/paths";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";
import { MagneticLink } from "./magnetic";

/**
 * Single responsive menu: one <ul> in the DOM, rendered as a horizontal
 * row on md+ and as a focus-trapped panel on mobile. Esc closes.
 */
export function Navbar() {
  const lang = useLang((s) => s.lang);
  const theme = useLang((s) => s.theme);
  const tr = t(lang);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    burgerRef.current?.focus();
  }, []);

  // Esc close + focus trap for the mobile panel
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    // focus first link on open
    const firstFocus = panel.querySelector<HTMLElement>("a[href], button");
    firstFocus?.focus();
    return () => panel.removeEventListener("keydown", onKey);
  }, [open, close]);

  const links = [
    { href: "#generator", label: tr.nav_generator },
    { href: "#scanner", label: tr.nav_scanner },
    { href: "#features", label: tr.nav_features },
    { href: "#lab", label: tr.lab_kicker },
    { href: "#faq", label: tr.nav_faq },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open
          ? "border-b border-line bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 lg:px-8"
        aria-label="SALIRA main navigation"
      >
        {/* brand mark + wordmark — reads exactly SALIRA */}
        <a href="#top" className="group flex items-center gap-2.5" aria-label="SALIRA home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBase(theme === "dark" ? "/logo-mark-dark.svg" : "/logo-mark.svg")}
            alt=""
            aria-hidden
            width={27}
            height={27}
            className="h-[27px] w-[27px] shrink-0 transition-transform duration-300 group-hover:scale-110"
          />
          <span className="font-display text-[22px] tracking-[0.34em] text-ink transition-colors group-hover:text-goldsoft">
            SALIRA
          </span>
        </a>

        {/* ── ONE list: row on desktop, panel on mobile ── */}
        <div
          ref={panelRef}
          id="main-menu"
          className={`absolute end-4 top-[64px] w-64 overflow-hidden rounded-2xl border border-line bg-panel/95 shadow-2xl backdrop-blur-xl transition-all duration-400 md:static md:end-auto md:top-auto md:w-auto md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none ${
            open ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0 md:pointer-events-auto md:max-h-none md:opacity-100"
          }`}
        >
          <ul className="flex flex-col gap-1 p-3 md:flex-row md:items-center md:gap-8 md:p-0">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="nav-link block rounded-lg px-3 py-2.5 text-[13.5px] text-ink/75 transition-colors hover:text-goldsoft md:px-0 md:py-0"
                >
                  {l.label}
                </a>
              </li>
            ))}
            {/* mobile-only actions live inside the same list */}
            <li className="md:hidden" aria-hidden={!open}>
              <button
                onClick={() => {
                  useLang.getState().toggle();
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-start font-mono text-[12px] tracking-[0.2em] text-gold transition-colors hover:text-goldsoft"
              >
                {lang === "fa" ? "EN" : "FA"}
              </button>
            </li>
            <li className="md:hidden" aria-hidden={!open}>
              <a
                href="#generator"
                onClick={() => setOpen(false)}
                className="btn-gold block rounded-full px-5 py-2.5 text-center text-[13px]"
              >
                {tr.nav_cta}
              </a>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => useLang.getState().toggle()}
            className="hidden rounded-lg px-2 py-1.5 font-mono text-[11px] tracking-[0.2em] text-gold transition-colors hover:text-goldsoft md:block"
            aria-label="switch language"
          >
            {lang === "fa" ? "EN" : "FA"}
          </button>
          <button
            onClick={() => useLang.getState().toggleTheme()}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-gold transition-colors hover:border-line-hi hover:text-goldsoft"
            aria-label={tr.theme_toggle}
            title={tr.theme_toggle}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <MagneticLink
            href="#generator"
            className="btn-gold hidden rounded-full px-5 py-2 text-[13px] md:inline-flex"
          >
            {tr.nav_cta}
          </MagneticLink>
          <button
            ref={burgerRef}
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line md:hidden"
            aria-label={tr.nav_menu}
            aria-expanded={open}
            aria-controls="main-menu"
          >
            <span className="space-y-1.5">
              <span className={`block h-px w-5 bg-goldsoft transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
              <span className={`block h-px w-5 bg-goldsoft transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
