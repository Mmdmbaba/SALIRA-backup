"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";

/**
 * Subtle magnetic effect: the element leans a few pixels toward the cursor.
 * Returns to rest on leave. Used on primary CTAs.
 */
export function Magnetic({ children, strength = 14 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setPos({ x: (dx / r.width) * strength, y: (dy / r.height) * strength });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: pos.x === 0 && pos.y === 0 ? "transform 0.6s cubic-bezier(0.22,1,0.36,1)" : "transform 0.12s ease-out",
      }}
      className="inline-block"
    >
      {children}
    </div>
  );
}

export function MagneticLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Magnetic>
      <a href={href} className={className}>
        {children}
      </a>
    </Magnetic>
  );
}
