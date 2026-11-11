"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient SALIRA background: warm luminary at the top, faint hairline
 * columns, a fine grid near the hero and a scroll progress hairline.
 */
export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* warm luminary */}
      <div className="luminary inset-x-0 top-0 h-[60vh]" />
      {/* hairline columns */}
      <div className="bg-columns absolute inset-0 opacity-70" />
      {/* fine grid fading out */}
      <div className="bg-hairline-grid absolute inset-x-0 top-0 h-[120vh]" />
      {/* bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

/** Thin gold scroll-progress hairline pinned to the top. */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-px bg-ink/5">
      <div
        className="h-px bg-gradient-to-r from-golddeep via-goldsoft to-golddeep transition-[width] duration-150"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

/** Wrapper that fades+slides children in when they enter the viewport. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let io: IntersectionObserver | null = null;
    const show = () => {
      el.classList.add("is-visible");
      io?.disconnect();
    };
    // safety: if already in the viewport at mount, reveal immediately
    // (covers flaky IntersectionObserver / hidden-ancestor cases)
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      show();
      return;
    }
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) show();
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io?.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
