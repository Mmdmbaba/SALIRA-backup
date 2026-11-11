# لوگوی SALIRA — وضعیت نهایی و پرامپت‌ها

> **وضعیت: نهایی شد.** طرح پین‌ویل مثلثی توسط کاربر با ابزار تصویرساز تولید و تأیید شد
> (2026-11-12) و به‌صورت پارامتریک وکتورسازی شد. مرجع رسمی: `brand/logo-master.svg` و `public/logo.svg`.

## مشخصات فنی لوگوی نهایی

| بخش | شرح |
|---|---|
| هسته | مثلث متساوی‌الأضلاع گردگوشه، پر بنفش `#8B54FF`، سوراخ منفی مثلثی در مرکز، خط دور سرمه‌ای `#273842`؛ مرکز هسته ~۱۷ واحد پایین‌تر از مرکز مدار |
| هاله | ۳ مثلث خطی (بدون پرشدگی) سرمه‌ای، چرخش ۱۲۰° حول مرکز مدار + پیچ ۸° ساعتگرد (پین‌ویل)، شعاع مدار ~۲۰ واحد |
| وردمارک | `SALIRA` — Space Grotesk 700 وکتورشده (بدون وابستگی به فونت)، tracking ≈ ۲٪، زیر مارک |
| نسبت | عرض وردمارک ≈ عرض مارک؛ کل لاک‌آپ ≈ ۱:۱٫۳ |

### فایل‌ها

- `public/logo.svg` — لاک‌آپ برای پس‌زمینه‌ی روشن (خطوط سرمه‌ای)
- `public/logo-dark.svg` — لاک‌آپ برای پس‌زمینه‌ی تیره (خطوط روشن `#E9EDFB`)
- `public/logo-mark.svg` / `public/logo-mark-dark.svg` — فقط مارک (نوبار/فوتر)
- `src/app/icon.svg` — favicon: مارک روی کاشی اوبسیدین `#0D1126`
- `brand/logo-mono-white.svg` / `brand/logo-mono-navy.svg` — تک‌رنگ‌ها
- `brand/logo-master.svg` — نسخه‌ی مادر
- `scripts/build_logo.py` — مولد پارامتریک؛ هر تغییر هندسه/رنگ از همین فایل

### نسخه‌بندی تصویرساز (برای تولید دوباره یا تنوع)

```
Minimal geometric logo mark for a privacy-tech brand. A solid rounded-corner
equilateral triangle with a small triangular negative-space hole in its center,
filled vivid violet (#8B54FF) with a thin dark-navy (#273842) outline, sitting
slightly below center. Around it, three larger hollow triangle outlines in the
same dark navy (#273842) rotate 120 degrees apart around the mark center,
slightly twisted clockwise like a pinwheel, their edges passing behind the
violet core. Flat vector style, crisp uniform strokes, off-white background
(#FFFEF8), balanced asymmetric composition, modern tech aesthetic. Below the
mark: the wordmark SALIRA in bold geometric sans-serif (Space Grotesk style),
near-black. No tagline, no extra text, no shadows, no 3D, no gradients inside
the triangles.
```

Negative prompt:

```
photorealistic, 3D render, bevel, emboss, heavy drop shadow, neon glow overload,
rainbow gradient, extra text, tagline, watermark, busy background, chrome effect,
gradient mesh, low contrast, distorted triangles, sketch lines
```

---

## آرشیو — پرامپت‌های مرحله‌ی ایده‌پردازی (نسخه‌ی مونوگرام S، منسوخ)

این پرامپت‌ها مونوگرام «S برش‌خورده» را می‌ساختند؛ ابزار تصویرساز به‌جای آن
ترکیب مثلثی را تولید کرد که توسط کاربر انتخاب و نهایی شد. برای مستندسازی نگه داشته می‌شوند.

### A — App Icon

```
Minimal geometric app icon for a privacy-tech brand. A bold letter S monogram
constructed from two circular arc segments (each roughly 270 degrees) with
rounded end caps, drawn with a smooth diagonal gradient from vivid violet
(#7C3AED) at the top to bright blue (#3B82F6) at the bottom. Two thin
horizontal negative-space gaps slice cleanly through the monogram, creating a
sliced, engineered look. Background: deep navy-obsidian rounded square
(#0D1126) with a very subtle violet glow behind the letter and a thin 1.5px
gradient border, corner radius about 22 percent. Flat vector style, crisp
clean edges, perfectly centered composition, modern SaaS aesthetic, high
contrast. No extra text, no letters other than the single S, no drop shadows,
no 3D bevels, no photorealism.
```

### B — Horizontal Lockup

```
Horizontal logo lockup for a privacy-tech brand on a deep navy background
(#0D1126). Left side: a geometric S monogram made of two 270-degree circular
arc segments with rounded caps, upper segment vivid violet (#7C3AED) blending
into lower segment bright blue (#3B82F6), sliced by two thin horizontal
negative-space gaps, with a subtle violet glow behind it. Right side: the
wordmark SALIRA in uppercase geometric sans-serif (Space Grotesk style),
generous letter-spacing around 30 percent tracking, clean off-white (#F2F4FF).
Flat vector branding style, crisp edges, balanced negative space, modern
minimal SaaS aesthetic. No tagline, no words besides SALIRA, no extra icons,
no shadows, no 3D effects.
```
