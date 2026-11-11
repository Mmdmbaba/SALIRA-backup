# SALIRA

وب‌اپ دو زبانه (فا/EN) برای اینترنت آزاد: مولد کانفیگ AmneziaWG با ثبت‌نام مستقیم WARP، اسکنر واقعی Endpoint با دست‌دادن WireGuard، و ویزارد خودکار دیپلوی پروکسی MTProto روی هاست رایگان Pterodactyl.

## اجرا

```bash
bun install                 # یا npm install / pnpm install
cp .env.example .env        # DATABASE_URL برای Prisma (SQLite)
bun run db:push             # ساخت دیتابیس
bun run dev                 # http://localhost:3000
```

## ساختار

```
src/app/                 صفحه اصلی (SPA با hash-routing) + API routes
  api/warp/              ثبت‌نام مستقیم WARP (کلید خصوصی هرگز ذخیره نمی‌شود)
  api/scan/              تأیید Endpoint با دست‌دادن واقعی WireGuard (UDP)
  api/stats/             آمار زنده‌ی میزکار (probe رنج‌ها + TCP پروکسی، کش ۴ دقیقه)
  api/proxy/kata/        ارکستراتور دیپلوی MTProto روی پنل Pterodactyl
src/components/salira/   مولد (ویزارد ۵ مرحله‌ای)، اسکنر، ویزارد پروکسی، میزکار، ...
src/lib/                 موتور کانفیگ AmneziaWG، دست‌دادن WireGuard (BLAKE2s/ChaCha20)، i18n، ...
mtproto/app.py           هسته‌ی alexbers/mtprotoproxy (پچ‌شده برای پایتون جدید) — توسط api/proxy خوانده می‌شود
public/guide/            اسکرین‌شات‌های راهنمای پروکسی خودکار
scripts/                 تست‌های رگرسیون + ابزارهای بکاپ/لاگ
brand/                   برندکیت (BRAND.md + پرامپت لوگو)
ROADMAP.md               نقشه راه قابلیت‌ها
```

## نکته‌های مهم

- کلید خصوصی کانفیگ فقط در مرورگر ساخته می‌شود؛ سرور فقط کلید عمومی را به Cloudflare می‌فرستد و هیچ چیزی لاگ/ذخیره نمی‌شود.
- در ماژول پروکسی خودکار، کلید API پنل فقط در حافظه‌ی همان درخواست استفاده می‌شود.
- متغیرهای اختیاری: `SALIRA_PROXY_HOST`، `SALIRA_PROXY_PORT`، `SALIRA_PANEL_BASE`، `NEXT_PUBLIC_SITE_URL`.
- تست‌ها: `bun scripts/test_wg_handshake.ts` و `bun scripts/test_aead.ts`

## سیستم ضد رول‌بک (بکاپ + لاگ)

این ریپو روی گیت‌هاب بکاپ می‌شود و هر مرحله در `WORKLOG.md` ثبت می‌گردد:

```bash
bash scripts/resume.sh                  # شروع نشست / ادامه بعد از قطعی
bash scripts/backup.sh "توضیح مرحله"    # commit + push روی GitHub
```

قواعد کامل در `PROTOCOL.md`.

## برند

هویت بصری و قواعد استفاده در `brand/BRAND.md` و نسخه‌ی رسمی PDF آن؛ پرامپت ساخت لوگو در `brand/logo-prompt.md`.

MIT License — بازسازی آزاد بر پایه‌ی x4gpanell/Amnezia-Wg
