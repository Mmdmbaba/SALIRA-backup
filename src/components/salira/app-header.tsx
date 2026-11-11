"use client";

import { Sun, Moon, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/lang-store";
import { useAppView } from "@/lib/view-store";
import { t } from "@/lib/i18n";

/** Slim app-style header: current page title + live badge + lang/theme. */
export function AppHeader() {
  const lang = useLang((s) => s.lang);
  const theme = useLang((s) => s.theme);
  const tr = t(lang);
  const view = useAppView((s) => s.view);

  const titleKey: Record<string, string> = {
    home: tr.hero_kicker,
    generator: tr.nav_generator,
    scanner: tr.nav_scanner,
    proxy: tr.nav_proxy,
    lab: tr.lab_title,
    faq: tr.nav_faq,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-background/78 backdrop-blur-xl">
      <div
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 md:ps-24 lg:px-8 ${
          lang === "fa" ? "pe-5" : ""
        }`}
      >
        {/* wordmark + page title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => useAppView.getState().navigate("home")}
            className="font-display shrink-0 text-[17px] tracking-[0.3em] text-ink transition-colors hover:text-goldsoft"
            aria-label="SALIRA home"
          >
            SALIRA
          </button>
          <span aria-hidden className="h-3.5 w-px bg-line-strong" />
          <motion.span
            key={view + lang}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="truncate text-[12.5px] text-ink/55"
          >
            {titleKey[view]}
          </motion.span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-ok/30 px-2.5 py-1 font-mono text-[9px] tracking-[0.22em] text-ok sm:flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" />
            {tr.hero_card_badge}
          </span>
          <button
            onClick={() => useAppView.getState().navigate("proxy")}
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 text-[11px] font-bold text-gold transition-colors hover:border-gold/60 hover:text-goldsoft md:flex"
          >
            <Send size={12} />
            {tr.nav_proxy}
          </button>
          <button
            onClick={() => useLang.getState().toggle()}
            className="rounded-lg px-2 py-1.5 font-mono text-[11px] tracking-[0.2em] text-gold transition-colors hover:text-goldsoft"
            aria-label="switch language"
          >
            {lang === "fa" ? "EN" : "FA"}
          </button>
          <button
            onClick={() => useLang.getState().toggleTheme()}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-gold transition-colors hover:border-line-hi hover:text-goldsoft"
            aria-label={tr.theme_toggle}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Slim status bar replacing the old footer in app mode. */
export function StatusBar() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const year = lang === "fa" ? "۲۰۲۶" : "2026";

  return (
    <footer className="mt-auto">
      <div
        className={`mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 pb-24 pt-6 text-[10.5px] text-ink/35 md:ps-24 md:pb-6 lg:px-8`}
      >
        <span>
          {tr.footer_rights.replace("۲۰۲۶", year)} · {tr.footer_credit}
        </span>
        <div className="flex items-center gap-4">
          <StatusModalButton label={tr.privacy_title} kind="privacy" />
          <StatusModalButton label={tr.terms_title} kind="terms" />
        </div>
      </div>
    </footer>
  );
}

function StatusModalButton({ label, kind }: { label: string; kind: "privacy" | "terms" }) {
  return (
    <button onClick={() => useStatusModalStore.getState().open(kind)} className="nav-link text-ink/45">
      {label}
    </button>
  );
}

/* tiny store so the status bar can open the dialogs rendered at shell level */
import { create } from "zustand";

interface StatusModalState {
  kind: "privacy" | "terms" | null;
  open: (k: "privacy" | "terms") => void;
  close: () => void;
}

export const useStatusModalStore = create<StatusModalState>((set) => ({
  kind: null,
  open: (kind) => set({ kind }),
  close: () => set({ kind: null }),
}));
