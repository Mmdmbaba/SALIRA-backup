"use client";

import { motion } from "framer-motion";
import {
  Home,
  KeyRound,
  Radar,
  FlaskConical,
  CircleHelp,
  Send,
} from "lucide-react";
import { useAppView, type AppView } from "@/lib/view-store";
import { useLang } from "@/lib/lang-store";
import { t } from "@/lib/i18n";

/** The six app destinations, shared by the rail and the dock. */
export function useNavItems() {
  const lang = useLang((s) => s.lang);
  const tr = t(lang);
  const fa = lang === "fa";
  return [
    { view: "home" as AppView, label: tr.nav_home, short: tr.nav_home, icon: Home },
    { view: "generator" as AppView, label: tr.nav_generator, short: fa ? "مولد" : "Gen", icon: KeyRound },
    { view: "scanner" as AppView, label: tr.nav_scanner, short: fa ? "اسکنر" : "Scan", icon: Radar },
    { view: "proxy" as AppView, label: tr.nav_proxy, short: fa ? "پروکسی" : "Proxy", icon: Send },
    { view: "lab" as AppView, label: tr.lab_kicker, short: fa ? "آزمایشگاه" : "Lab", icon: FlaskConical },
    { view: "faq" as AppView, label: tr.nav_faq, short: tr.nav_faq, icon: CircleHelp },
  ];
}

/**
 * Desktop — a refined left dock. Every destination is always visible with its
 * label (no hover-expansion gimmick); the active item carries a gold pill.
 */
export function NavRail() {
  const items = useNavItems();
  const view = useAppView((s) => s.view);
  const navigate = useAppView((s) => s.navigate);

  return (
    <motion.nav
      aria-label="SALIRA"
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-3 top-1/2 z-50 hidden -translate-y-1/2 md:block"
    >
      <ul
        className="flex flex-col gap-1 rounded-[20px] border border-line bg-panel/85 p-1.5 shadow-2xl backdrop-blur-xl"
        style={{ width: 82 }}
      >
        {items.map((item) => {
          const active = view === item.view;
          const Icon = item.icon;
          return (
            <li key={item.view}>
              <button
                onClick={() => navigate(item.view)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-2xl outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gold/60 ${
                  active ? "text-gold" : "text-ink/45 hover:text-ink/85"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-2xl border border-line-strong bg-gold/12"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  aria-hidden
                  className={`absolute -left-[7px] h-4 w-[2.5px] rounded-full bg-gold transition-all duration-300 ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
                <Icon
                  size={17}
                  strokeWidth={active ? 2.2 : 1.7}
                  className="relative z-10 transition-transform duration-300 group-hover:scale-110"
                />
                <span className="relative z-10 text-[8.5px] font-bold leading-none tracking-tight">
                  {item.short}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}

/**
 * Mobile — fixed bottom dock (touch equivalent of the left dock).
 */
export function MobileDock() {
  const items = useNavItems();
  const view = useAppView((s) => s.view);
  const navigate = useAppView((s) => s.navigate);

  return (
    <nav
      aria-label="SALIRA"
      className="fixed inset-x-2 bottom-2 z-50 md:hidden"
    >
      <ul className="flex items-stretch justify-between gap-0.5 rounded-2xl border border-line bg-panel/92 px-1.5 py-1.5 shadow-2xl backdrop-blur-xl">
        {items.map((item) => {
          const active = view === item.view;
          const Icon = item.icon;
          return (
            <li key={item.view} className="flex-1">
              <button
                onClick={() => navigate(item.view)}
                aria-current={active ? "page" : undefined}
                className={`relative mx-auto flex h-12 w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                  active ? "text-gold" : "text-ink/45"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-xl border border-line-strong bg-gold/12"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={17} className="relative z-10" strokeWidth={active ? 2.2 : 1.8} />
                <span className="relative z-10 max-w-full truncate px-0.5 text-[8px] font-bold leading-none">
                  {item.short}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
