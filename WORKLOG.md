# WORKLOG — لاگ کاری پروژه SALIRA

> اگر کار قطع شده: اول `bash scripts/resume.sh` را اجرا کن، بعد `PROTOCOL.md` را بخوان و از «گام بعدی» ادامه بده.

## وضعیت فعلی

- آخرین به‌روزرسانی: 2026-11-11 17:20 UTC
- انجام‌شده در آخرین مرحله: دریافت سورس از کاربر، تحلیل کامل، ادغام در ریشه ریپو و رینیم کامل برند EEMA/ایما → SALIRA/سالیارا (۱۰۲+ نقطه، ۲۶ فایل) + دارایی‌های هویت جدید (logo.svg، icon.svg، og-image.png) + README و ROADMAP جدید
- مرحله جاری: رینیم تمام شد؛ برندکیت (PDF + brand/BRAND.md + پرامپت لوگو) در حال ساخت است
- گام بعدی: ۱) تحویل برندکیت و پرامپت لوگو به کاربر ۲) بکاپ نهایی ۳) نشست بعد: اعمال هویت بنفش روی تم سایت طبق ROADMAP.md؛ قابلیت‌های ۲-۴ نقشه راه در انتظار توضیحات کاربر

## لاگ

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
