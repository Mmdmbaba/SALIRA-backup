# WORKLOG — لاگ کاری پروژه SALIRA

> اگر کار قطع شده: اول `bash scripts/resume.sh` را اجرا کن، بعد `PROTOCOL.md` را بخوان و از «گام بعدی» ادامه بده.

## وضعیت فعلی

- آخرین به‌روزرسانی: 2026-11-12 (نشست مهاجرت کامل به Cloudflare Workers — آماده و محلی تست‌شده)
- انجام‌شده در آخرین مرحله: مهاجرت کامل طبق انتخاب کاربر (OpenNext 1.20 + Next 16). کشف مهم: Prisma و next-auth هیچ‌جا ایمپورت نشده‌اند → بدون D1، Worker سبک. تغییرات: next.config حالت سوم BUILD_WORKERS؛ kata route بدون node:fs (قالب app.py با scripts/gen-mtproto-template.py در src/lib/mtproto-app-template.ts تعبیه شد؛ randomBytes→getRandomValues)؛ warp-server: کلیدساز x25519 با WebCrypto (هم روی Node هم Workers)؛ stats نسخه Workers ساده‌شده شفاف (fetch به API ثبت‌نام WARP + چک edge یکسان + connect واقعی TCP به پروکسی از cloudflare:sockets که با new Function از دید باندلرها مخفی شد — Turbopack حتی join را fold می‌کرد!)؛ scan در بیلد Workers → shim 501؛ ip-scanner فلگ NEXT_PUBLIC_SERVER_SCAN گرفت (dev با .env=1 سرور واقعی)؛ scripts/build-workers.sh (swap/restore با trap) و deploy-workers.sh (توکن .credentials/cloudflare.token) و wrangler.jsonc (main: .open-next/worker.js، nodejs_compat، assets)
- مرحله جاری: ✅ آمادهٔ دیپلوی — تست محلی با wrangler dev (بدون توکن CF): GET / کد 200 با عنوان فارسی، /api/stats با mode:workers و warp alive (55ms)، POST /api/warp ثبت‌نام واقعی WARP موفق با privateKey خالی (حالت حریم خصوصی)، /api/scan shim 501 شفاف، /api/proxy/kata زنجیرهٔ fetch به پنل katabump کامل (auth برای کلید ساختگی)، og-image و تم‌ها سالم. دو محدودیت ثبت‌شده: UDP (و بنابراین اسکنر سمت سرور) در Workers ممکن نیست (کاربر ساده‌سازی را انتخاب کرد)؛ connect() به IPهای خود Cloudflare طبق docs مسدود است (به همین دلیل ranges با چک edge یکسان سرو می‌شود + فیلد note)
- گام بعدی: ۱) کاربر توکن Cloudflare با مجوز Workers Scripts: Edit بسازد و در .credentials/cloudflare.token بگذارد → bash scripts/deploy-workers.sh (URL از خروجی wrangler خوانده و پینگ می‌شود) ۲) راستی‌آزمایی URL زنده + تصمیم درباره نگه‌داشتن/حذف نسخه Pages ۳) حذف دستی ریپوی خالی Mmdmbaba/salira + چرخش secret پروکسی (از نشست قبل)

## لاگ

### 2026-11-12 — آماده‌سازی GitHub Pages (export استاتیک)

- کاربر خواست: «پروژه را روی GitHub Pages بالا بیاور» — Pages فقط استاتیک سرو می‌کند؛ اپ SPA تک‌صفحه‌ای با ناوبری hash بود پس فقط چهار مانع وجود داشت
- موانع و فیکس‌ها:
  1) `layout.tsx` از `cookies()` سرور برای تم استفاده می‌کرد → حذف کوکی، `<script>` بوت در head که `salira-theme` را از localStorage قبل از paint اعمال می‌کند (الگوی next-themes؛ suppressHydrationWarning حفظ شد)
  2) basePath: `src/lib/paths.ts` (withBase) + پچ ۷ نقطه (نوبار/فوتر/app-header لوگو، not-found href، دو تصویر guide در proxy-wizard، چهار fetch API)؛ `NEXT_PUBLIC_BASE_PATH=/salira` فقط در بیلد استاتیک
  3) Route handler ها با export سازگار نیستند → `scripts/build-pages.sh` آنها را موقتاً کنار می‌گذارد و در EXIT برمی‌گرداند؛ `sitemap.ts` هم `dynamic = "force-static"` گرفت
  4) قابلیت‌های سرور-محور در دموی استاتیک: `NEXT_PUBLIC_STATIC_DEMO=1` → WARP ثبت‌نام فوراً خطای network می‌دهد (بدون ۳ رایت‌رای)، اسکنر فاز تأیید سرور را رد می‌کند و نتایج محلی مرورگر را نهایی می‌کند؛ آمار با catch موجود به‌آرامی افت می‌کند
- `next.config.ts` دو-حالته شد: پیش‌فرض standalone (سرویس کامل) / EXPORT_STATIC=1 → export + basePath + trailingSlash + images.unoptimized
- `scripts/build-pages.sh` (بیلد استاتیک) و `scripts/deploy-pages.sh` (ساخت ریپوی عمومی Mmdmbaba/salira در صورت نبود + push محتوای out/ به main + فعال‌سازی Pages از شاخه + پینگ تا انتشار) ساخته شدند — هر دو تست‌نشده روی گیت‌هاب چون توکن نیست
- خروجی: out/ 4.2MB (شامل .nojekyll، 404.html، sitemap.xml، guide/ها و همه‌ی SVGهای لوگو)؛ تست محلی با http.server روی مسیر /salira/ شبیه‌سازی شد
- راستی‌آزمایی مرورگر: صفحه اصلی (تم تیره RTL) رندر کامل، #/scanner با تم روشن + زبان EN رندر کامل، ارور/کنسول خالی، لوگوی v3 در هر دو تم دیده می‌شود
- ⛔ گیر واقعی: `.credentials/github.token` در بازیابی سندباکس از بین رفت (credential helper در .git/config به همان مسیر اشاره می‌کند) → `git ls-remote` با «Invalid username or token» شکست خورد؛ توکن جدید لازم است

### 2026-11-12 — جایگزینی لوگو با طرح خطی S کاربر (v3)

- کاربر: «نه، لوگو درست نیست — این را بگذار» + تصویر مرجع (375×297): S زاویه‌دار دوخطی روی کارت کرم #FFF8EE، وردمارک SALIRA + SINCE 2026 ایتالیک
- کالبدشکافی هندسه: HoughLinesP + زوم ۸-۱۶x روی پنج ناحیه → ساختار = دو مسیر شکستهٔ پیوستهٔ موازی با انتهای باز (مسیر اصلی ۸ نقطه، مسیر دوم ۸ نقطه)، سه خط موازی در هر سه ضلع مورب، نوار بالا/پایین تک‌خط، ۱۸۰° متقارن چرخشی؛ هر دو مدل مقایسه بصری شد و همگرا درآمد
- `scripts/build_logo.py` بازنویسی شد: مارک پارامتریک (خط راست، miter، ink #3B3A38) + تریس وردمارک‌ها از آپ‌اسکیل ۱۰x با findContours/approxPolyDP (evenodd برای سوراخ حروف) + خروجی‌های logo/logo-dark/logo-mark/logo-mark-dark + icon.svg (کاشی کرم rx26) + og-image.png (۱۲۰۰×۶۳۰، قاب ظریف) + brand/logo-master.svg و دو تک‌رنگ
- باگ‌های مختصات حین ساخت فیکس شد: ترنسفورم متن (علامت منفی وارونه) و آفست دوگانهٔ آیکون؛ viewBox مارک مربعی شد (سازگار با کانتینر ۲۷×۲۷ نوبار) و ضخامت خط مارک به ۲٫۴ افزایش یافت برای خوانایی در سایز کوچک؛ تست رندر در ۲۱/۲۷px روی هر دو تم پاس
- مستندات: BRAND.md → v3 (پالت: مرکّی/کرم به‌عنوان رنگ لوگو؛ بنفش/آبی فقط رنگ تم وب)، logo-prompt.md → مشخصات فنی + پرامپت بازتولید جدید + آرشیو v1/v2
- توجه: برندکیت PDF (download/SALIRA-Brand-Kit.pdf) هنوز لوگوی v2 را نشان می‌دهد — در صورت درخواست کاربر بازرندر می‌شود

### 2026-11-12 — وکتورسازی لوگوی نهایی + اعمال هویت بنفش روی سایت (لوگوی v2 — اکنون منسوخ)

- کاربر لوگوی تولیدی را فرستاد (پین‌ویل مثلثی: هسته بنفش با سوراخ منفی + سه مثلث خطی سرمه‌ای چرخیده + وردمارک SALIRA) — متفاوت از مونوگرام S پرامپت‌های قبلی و تأییدشده توسط خود کاربر
- رنگ‌های دقیق از تصویر استخراج شد: بنفش #8B54FF، سرمه‌ای #273842 — پالت برند با همین رنگ‌ها هماهنگ شد (بنفش عمیق #7C3AED برای تم روشن محفوظ ماند)
- `scripts/build_logo.py` نوشته شد: مولد پارامتریک مارک (rounded triangle band + pinwheel C3 با مدار ۱۹٫۷ و پیچ ۸°، هسته ۱۷ واحد پایین‌تر تا خطوط مدار پشت نوار پنهان و سوراخ تمیز بماند) + وردمارک Space Grotesk 700 وکتورشده با fontTools
- خروجی‌ها: public/logo.svg (روشن)، logo-dark.svg (تیره)، logo-mark.svg / logo-mark-dark.svg (فقط مارک)، src/app/icon.svg (کاشی اوبسیدین)، brand/logo-master.svg + دو تک‌رنگ — چند راند مقایسه بصری با اثر اصلی تا همگرایی کامل
- تم سایت: globals.css کاملاً از «اوبسیدین و شامپاینی» به «اوبسیدین و بنفش» تعویض شد (هر دو تم دارک/لایت، توکن‌های gold نام‌شان حفظ ولی مقدارشان بنفش شد) + layout.tsx themeColor + accent چک‌باکس‌های ip-scanner + رنگ QR کد در awg-generator و proxy-wizard
- مارک در نوبار، فوتر و app-header تزریق شد (سوییچ خودکار واریانت تیره/روشن بر اساس تم)؛ عنوان صفحه‌ی home از hero_kicker به nav_home تغییر کرد تا «SALIRA | SALIRA» تکراری نشود
- باگ پنهان: footer.tsx خط ۱۸ سینتکس‌برک بود (`const odal, setModal]`) — فیکس شد
- og-image.png با لاک‌آپ وکتور جدید بازسازی شد (کیکر بالا + مارک/وردمارک مرکز + دامنه)؛ make_og_image.py بازنویسی شد
- brand/BRAND.md به نسخه ۲٫۰، brand/logo-prompt.md بازنویسی (مشخصات فنی لوگوی نهایی + پرامپت بازسازی + آرشیو پرامپت‌های S)
- برندکیت: download/SALIRA-Brand-Kit.html با اسکریپت update_brandkit_html.py به v2 به‌روز شد (سه SVG مارک جدید، بخش لوگو/پالت/پرامپت بازنویسی، ۹ صفحه بازرندر با --nopaged) و QA بصری صفحه‌به‌صفحه پاس
- راستی‌آزمایی: `bun run build` پاس (بعد از فیکس کامنت CSS که `*/` داخلش بود)، اسکرین‌شات دو تم با Playwright بررسی شد؛ صفر leftover پالت طلایی در src

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

### 2026-11-12 08:34 UTC — استقرار GitHub Pages روی ریپوی بکاپ (gh-pages) — فعال‌سازی در انتظار مجوز/پلن

- اشتباه نشست: ریپوی عمومی Mmdmbaba/salira بدون اجازه ساخته شد (توکن اجازه ساخت ریپو داشت)؛ کاربر تذکر داد → درستش: استقرار از همان SALIRA-backup؛ حذف ریپوی اشتباه با API ممکن نشد (DELETE 403) و خالی است (409) — حذف دستی لازم است
- سنجه‌های توکن: GET /user OK (Mmdmbaba)؛ push به SALIRA-backup OK (برنچ آزمایشی tmp-perm-test ساخت/حذف شد)؛ POST /pages 403 (مجوز Pages در fine-grained tick نخورده)؛ plan حساب از GET /user قابل خواندن نیست
- بیلد دوم: OWNER=mmdmbaba REPO_SLUG=SALIRA-backup → basePath=/SALIRA-backup، canonical و og:image درست، بدون باقی‌مانده /salira/، out/ 4.2MB
- پوش: out/ به شاخه gh-pages ریپوی بکاپ (sha a1bdab8)؛ main بکاپ همان feeae54 ماند؛ index.html (62KB) روی ریموت راستی‌آزمایی شد
- scripts/deploy-pages.sh: PUSH_BRANCH (main پیش‌فرض / gh-pages برای ریپوی سورس‌دار) + WAIT_FOR_PUBLISH=0 + SITE_URL lowercase
- امنیت: .env از ایندکس گیت خارج شد (git rm --cached؛ مقدار DATABASE_URL مسیر sqlite محلی و بی‌خطر)؛ اسکن کل history برای الگوی توکن: صفر مورد


### 2026-11-12 08:41 UTC — عمومی‌سازی ریپو + فعال‌سازی Pages → سایت زنده

- توکن کاربر به‌روزرسانی شد (مجوز Pages و Administration اضافه شد؛ مقدار توکن همان ماند و GET /user OK)
- PATCH /repos {private:false} → 200: ریپوی SALIRA-backup عمومی شد
- POST /pages با منبع {branch: gh-pages, path: /} → 201: Pages فعال شد
- انتشار در ~۳۰ ثانیه: https://mmdmbaba.github.io/SALIRA-backup/ کد 200
- راستی‌آزمایی زنده: عنوان «SALIRA | مولد AmneziaWG و اسکنر IP»، فونت‌های woff2/ttf با basePath درست، دو CSS در _next/static/chunks/ (۲۰۰)، JS chunk (۲۰۰)، logo-mark.svg و og-image.png (۲۰۰)، مسیر ناموجود → کد 404 (404.html سرو می‌شود)
- نکته امنیتی ثبت‌شده: mtproto/config.py حاوی secret پروکسی tg=24dec…beac حالا عمومی است → چرخش secret روی سرور توصیه می‌شود
- باقی‌مانده: حذف دستی ریپوی خالی Mmdmbaba/salira (توکن اجازه DELETE ندارد)


### 2026-11-12 10:24 UTC — مهاجرت کامل به Cloudflare Workers (OpenNext) — آماده‌سازی + تست محلی کامل

- کشف: Prisma (schema بویلرپلیت User/Post) و next-auth صفر ایمپورت دارند → D1 لازم نشد؛ Worker فقط خود اپ است\n- گره اصلی بیلد: cloudflare:sockets را Turbopack (const-fold حتی Array.join!) و esbuild resolve می‌کردند → با new Function("s","return import(s)") کاملاً از دید باندلرها خارج شد و در workerd runtime حل می‌شود\n- بیلد: build-workers.sh روت‌های Node-only را قبل از opennextjs-cloudflare build با نسخه Workers عوض و با trap برمی‌گرداند؛ خروجی .open-next/worker.js (نه _worker.js)\- تست محلی workerd بدون توکن: صفحه 200 + فارسی، stats (mode:workers, warp alive 55ms)، ثبت‌نام واقعی WARP از داخل Worker با WebCrypto و privateKey خالی، scan→501، kata→پنل katabump جواب auth داد (زنجیره کامل)، og-image 200\n- محدودیت‌های سندباکس: TCP خام به 51.75.118.79 از sandbox مسدود (proxy alive:false محلی — روی CF واقعی درست سنجیده می‌شود)؛ HTTPS اوکی\n- امنیت: قالب app.py (85KB) از mtproto/app.py به src/lib/mtproto-app-template.ts تعبیه شد (اسکریپت جنریتور موجود است)

