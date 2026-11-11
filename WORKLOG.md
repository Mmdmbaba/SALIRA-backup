# WORKLOG — لاگ کاری پروژه SALIRA

> اگر کار قطع شده: اول `bash scripts/resume.sh` را اجرا کن، بعد `PROTOCOL.md` را بخوان و از «گام بعدی» ادامه بده.

## وضعیت فعلی

- آخرین به‌روزرسانی: 2026-11-11 18:05 UTC
- انجام‌شده در آخرین مرحله: برندکیت کامل تحویل شد — PDF رسمی ۹ صفحه‌ای فارسی RTL (download/SALIRA-Brand-Kit.pdf + HTML) با فونت‌های لوکال Vazirmatn/Space Grotesk، QA پاس، متادیتا ست شد + نسخه‌های ریپو: brand/BRAND.md و brand/logo-prompt.md
- مرحله جاری: نشست تحلیل سورس + رینیم + برندکیت تمام شد؛ همه‌چیز روی گیت‌هاب بکاپ شده
- گام بعدی: ۱) کاربر پرامپت‌های brand/logo-prompt.md را به عکس‌ساز می‌دهد و لوگوی نهایی را برمی‌گرداند ۲) نشست بعد: اعمال هویت بنفش روی تم سایت (globals.css + کامپوننت‌ها طبق brand/BRAND.md) ۳) جایگزینی لوگوی نهایی پس از وکتورسازی ۴) شروع قابلیت‌های ۲-۴ نقشه راه پس از توضیحات کاربر

## لاگ

### 2026-11-11 18:05 UTC — برندکیت رسمی و پرامپت لوگو

- تصمیمات نهایی برند از کاربر: بنفش-آبی گرادیانت (#7C3AED→#3B82F6) + گلس‌مورفیسم، مونوگرام S، وردمارک فقط لاتین، فارسی «سالیارا»، بدون شعار، دامنه placeholder salira.example
- برندکیت PDF فارسی RTL ۹ صفحه‌ای ساخته شد (خط Creative Flow + html2pdf-next.js با --nopaged؛ Paged.js با RTL ناسازگار بود): جلد، برند در یک نگاه، لوگو، پالت رنگ، تایپوگرافی، عناصر بصری، لحن، پرامپت لوگو
- فونت‌های Vazirmatn و Space Grotesk به‌صورت لوکال در download/fonts/ دانلود و embed شدند (Google Fonts CDN در رندر ناپایدار بود و متن فارسی به LiberationSans می‌افتاد)
- دو راند اصلاح بصری: حذف قاب دکوری کاور (تداخل خط/متن)، فیکس سرریز وردمارک در تایل‌ها، فیکس letter-spacing فارسی کیکر کاور، بازساخت بلاک فایل‌های پایانی به RTL
- QA نهایی: بدون صفحه خالی، بدون سرریز واقعی (هشدار p7 false-positive بود — با بررسی بصری تأیید شد)، fill همه صفحات کافی، متادیتا (Title/Author/Subject/Creator) ست شد
- نسخه‌های ریپو: brand/BRAND.md (خلاصه فنی) + brand/logo-prompt.md (پرامپت‌های EN + negative + spec خروجی)
- تحویل‌ها: download/SALIRA-Brand-Kit.pdf، download/SALIRA-Brand-Kit.html، download/fonts/*

### 2026-11-11 17:20 UTC — تحلیل سورس + رینیم کامل به SALIRA

- کاربر `eema-source.zip` را آپلود کرد؛ پروژه: وب‌اپ Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + Prisma/SQLite دو زبانه (EEMA — آتلیه‌ی اینترنت آزاد سابق)
- قابلیت‌های موجود: مولد AmneziaWG (ویزارد ۵ مرحله‌ای)، ثبت‌نام مستقیم WARP، اسکنر Endpoint با دست‌دادن واقعی WireGuard، ویزارد MTProto روی Pterodactyl، میزکار آمار زنده
- سورس از `eema/` به ریشه ریپو منتقل شد (flatten)؛ `.gitignore` ادغام شد؛ اسکریپت‌های تست به `scripts/` پیوستند
- تصمیمات برند (پاسخ کاربر): بنفش-آبی گرادیانت #7C3AED→#3B82F6 + گلس‌مورفیسم، مونوگرام S هندسی، وردمارک فقط لاتین، فارسی «سالیارا»، بدون شعار، دامنه placeholder `salira.example`، برندکیت PDF + ریپو، فقط پرامپت لوگو (بدون نمونه‌سازی)
- `scripts/rebrand_salira.py` اجرا شد: ۱۵۱ جایگزینی در ۲۶ فایل (برند، env vars: SALIRA_PROXY_HOST/PORT/PANEL_BASE، کلیدهای ذخیره‌سازی salira-lang/salira-theme، دامنه، متادیتا) + تغییر نام `src/components/eema` → `src/components/salira`
- شعار حذف شد از hero_kicker (fa/en)، footer_tagline (fa/en)، متاتایتل و og و gen_title («آتلیه/استودیو/آموزگاه» → بدون شعار)
- `package.json`: name → `salira`، version → 1.0.0
- دارایی‌های جدید: `public/logo.svg` (مونوگرام S برش‌خورده با گرادیانت بنفش-آبی)، `src/app/icon.svg` (favicon)، `public/og-image.png` (۱۲۰۰×۶۳۰ با `scripts/make_og_image.py`)؛ `scripts/make_og_image.js` برای رندر sharp بازنویسی شد
- راستی‌آزمایی: صفر leftover برند قدیم (به‌جز فایل سابقه‌ی مهاجرت `scripts/rebrand_salira.py`)، صفر import شکسته
- `ROADMAP.md` با ۴ قابلیت تعریف کاربر ساخته شد؛ موارد ۲-۴ در انتظار توضیحات کاربر

### 2026-11-11 16:55 UTC — راه‌اندازی سیستم ضد رول‌بک

- اتصال ریپوی محلی `/home/z/my-project` به `github.com/Mmdmbaba/SALIRA-backup` (خصوصی، شاخه `main`)
- ساخت `scripts/backup.sh` — commit و push خودکار با timestamp و محافظت rebase
- ساخت `scripts/resume.sh` — خواندن وضعیت، همگام‌سازی با ریموت و ادامه کار بعد از قطعی
- ساخت `scripts/worklog.sh` — افزودن ورودی فرمت‌دار به لاگ
- ساخت `PROTOCOL.md` — قرارداد کاری سه‌قانونه (بکاپ دائمی، لاگ دائمی، قابل ادامه بودن)
- تکمیل `.gitignore` — توکن و اطلاعات حساس (`.credentials/`) هرگز وارد ریپو نمی‌شوند
- توکن به‌صورت امن و خارج از گیت ذخیره شد؛ احراز هویت با credential helper انجام می‌شود
