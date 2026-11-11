"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // client-side breadcrumb only — nothing is sent anywhere
    console.error("SALIRA error boundary:", error.message);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="text-center">
        <p className="font-display text-[54px] leading-none text-bad/70" dir="ltr">
          ✕
        </p>
        <h1 className="font-display mt-4 text-[24px] text-ink">خطایی رخ داد</h1>
        <p className="mt-3 text-[13px] text-ink/50">
          مشکلی موقت پیش آمد؛ دوباره تلاش کنید.
        </p>
        <button onClick={reset} className="btn-gold mt-8 inline-flex rounded-full px-7 py-3 text-[14px]">
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
