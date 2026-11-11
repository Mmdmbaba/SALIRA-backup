"use client";

import { create } from "zustand";
import { useEffect, useLayoutEffect } from "react";
import type { Lang } from "./i18n";
import { t } from "./i18n";

export type AppView = "home" | "generator" | "scanner" | "proxy" | "lab" | "faq";

export const VIEWS: AppView[] = ["home", "generator", "scanner", "proxy", "lab", "faq"];

const HASH_TO_VIEW: Record<string, AppView> = {
  "": "home",
  "#/": "home",
  "#/generator": "generator",
  "#/scanner": "scanner",
  "#/proxy": "proxy",
  "#/lab": "lab",
  "#/faq": "faq",
};

const VIEW_TO_HASH: Record<AppView, string> = {
  home: "#/",
  generator: "#/generator",
  scanner: "#/scanner",
  proxy: "#/proxy",
  lab: "#/lab",
  faq: "#/faq",
};

interface ViewState {
  view: AppView;
  /** navigate programmatically; keeps the URL hash in sync */
  navigate: (v: AppView) => void;
  /** internal: called from the hashchange listener */
  _setFromHash: (v: AppView) => void;
}

/** Isomorphic layout effect (runs after hydration, before paint — no flash). */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const initialView: AppView = "home"; // SSR-safe: hash sync happens right after hydration

export const useAppView = create<ViewState>((set) => ({
  view: initialView,
  navigate: (v) => {
    set({ view: v });
    if (typeof window !== "undefined" && window.location.hash !== VIEW_TO_HASH[v]) {
      window.history.pushState(null, "", VIEW_TO_HASH[v]);
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
  _setFromHash: (v) => set({ view: v }),
}));

/** Sync the active view with the URL (hash) + update per-view document title. */
export function useViewSync(lang: Lang) {
  const navigate = useAppView((s) => s.navigate);
  const _setFromHash = useAppView((s) => s._setFromHash);
  const view = useAppView((s) => s.view);

  // apply the current hash BEFORE the first paint (post-hydration) so deep
  // links don't flash the home view — and without a hydration mismatch.
  useIsoLayoutEffect(() => {
    const v = HASH_TO_VIEW[window.location.hash] ?? "home";
    _setFromHash(v);
  }, [_setFromHash]);

  useEffect(() => {
    const apply = () => {
      const v = HASH_TO_VIEW[window.location.hash] ?? "home";
      _setFromHash(v);
    };
    window.addEventListener("hashchange", apply);
    window.addEventListener("popstate", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("popstate", apply);
    };
  }, [_setFromHash]);

  // per-view title
  useEffect(() => {
    const d = t(lang);
    const suffix = d.meta_title.split("|")[1]?.trim() ?? "SALIRA";
    const titles: Record<AppView, string> = {
      home: d.meta_title,
      generator: `${d.nav_generator} · ${suffix}`,
      scanner: `${d.nav_scanner} · ${suffix}`,
      proxy: `${d.nav_proxy} · ${suffix}`,
      lab: `${d.lab_title} · ${suffix}`,
      faq: `${d.faq_title} · ${suffix}`,
    };
    document.title = titles[view];
  }, [view, lang]);
}

/** Deep links like #generator (old anchors) map to the SPA view. */
export function navigateOrScroll(target: string) {
  const map: Record<string, AppView> = {
    "#generator": "generator",
    "#scanner": "scanner",
    "#proxy": "proxy",
    "#lab": "lab",
    "#roadmap": "lab",
    "#faq": "faq",
    "#top": "home",
  };
  const view = map[target];
  if (view) {
    useAppView.getState().navigate(view);
    return true;
  }
  return false;
}
