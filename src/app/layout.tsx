import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { Vazirmatn, Marcellus, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

/** Harmattan — the Persian UI typeface (fa only; en keeps Vazirmatn). */
const harmattan = localFont({
  variable: "--font-harmattan",
  src: [
    { path: "./fonts/Harmattan-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Harmattan-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Harmattan-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Harmattan-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const marcellus = Marcellus({
  variable: "--font-marcellus",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://salira.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SALIRA | مولد AmneziaWG و اسکنر IP",
    template: "%s · SALIRA",
  },
  description:
    "مولد آنلاین کانفیگ AmneziaWG با ثبت‌نام مستقیم Warp، انتخابگر IP تمیز کلادفلر و اسکنر واقعی Endpoint با دست‌دادن WireGuard.",
  keywords: [
    "SALIRA",
    "سالیارا",
    "AmneziaWG",
    "Warp",
    "Cloudflare",
    "VPN",
    "اسکنر IP",
    "IP Scanner",
    "MTProto",
    "WireGuard",
    "فیلترینگ",
  ],
  authors: [{ name: "SALIRA" }],
  alternates: {
    canonical: "/",
    languages: {
      fa: "/",
      en: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "SALIRA",
    description:
      "مولد AmneziaWG با ثبت‌نام مستقیم Warp، انتخابگر IP تمیز و اسکنر واقعی Endpoint با دست‌دادن WireGuard.",
    url: SITE_URL,
    siteName: "SALIRA",
    type: "website",
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SALIRA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SALIRA",
    description: "AmneziaWG generator with direct Warp registration and a real WireGuard endpoint scanner.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0908" },
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Theme is rendered server-side from the salira-theme cookie so hydration
 * never mismatches. No inline script mutates <html> before paint.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme =
    (await cookies()).get("salira-theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="fa" dir="rtl" className={theme} suppressHydrationWarning>
      <head />
      <body
        className={`${vazirmatn.variable} ${harmattan.variable} ${marcellus.variable} ${jetbrains.variable} antialiased bg-background text-foreground grain`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
