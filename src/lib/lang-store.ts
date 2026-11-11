"use client";

import { create } from "zustand";
import { useEffect } from "react";
import type { Lang } from "./i18n";
import { t } from "./i18n";

type Theme = "dark" | "light";

interface LangState {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme === "dark");
  // keep the SSR cookie in sync so server-rendered class always matches
  try {
    document.cookie = `salira-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

export const useLang = create<LangState>((set) => ({
  lang: "fa",
  theme: "dark",
  setLang: (lang) => {
    set({ lang });
    try {
      localStorage.setItem("salira-lang", lang);
    } catch {
      /* ignore */
    }
  },
  toggle: () =>
    set((s) => {
      const lang: Lang = s.lang === "fa" ? "en" : "fa";
      try {
        localStorage.setItem("salira-lang", lang);
      } catch {
        /* ignore */
      }
      return { lang };
    }),
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    try {
      localStorage.setItem("salira-theme", theme);
    } catch {
      /* ignore */
    }
  },
  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      try {
        localStorage.setItem("salira-theme", theme);
      } catch {
        /* ignore */
      }
      return { theme };
    }),
}));

/** Update document head meta for the active language (SEO + OG). */
function syncHead(lang: Lang) {
  const d = t(lang);
  document.title = d.meta_title;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', "content", d.meta_desc);
  setMeta('meta[property="og:title"]', "content", d.meta_title);
  setMeta('meta[property="og:description"]', "content", d.meta_desc);
  setMeta('meta[name="twitter:title"]', "content", d.meta_title);
  setMeta('meta[name="twitter:description"]', "content", d.meta_desc);
}

/** Sync <html dir/lang>, head meta and restore persisted choices (client-side only). */
export function useLangDirSync() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);

  useEffect(() => {
    let savedLang: string | null = null;
    let savedTheme: string | null = null;
    try {
      savedLang = localStorage.getItem("salira-lang");
      savedTheme = localStorage.getItem("salira-theme");
    } catch {
      /* ignore */
    }
    if (savedLang === "en" || savedLang === "fa") setLang(savedLang);

    // theme: SSR already rendered the class from the cookie — sync the store only.
    if (savedTheme === "light" || savedTheme === "dark") {
      useLang.setState({ theme: savedTheme });
    } else {
      const isLight = document.documentElement.classList.contains("light");
      useLang.setState({ theme: isLight ? "light" : "dark" });
      if (isLight) {
        // first visit with system-light preference: persist so SSR matches next time
        try {
          document.cookie = "salira-theme=light; path=/; max-age=31536000; samesite=lax";
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    syncHead(lang);
  }, [lang]);
}
