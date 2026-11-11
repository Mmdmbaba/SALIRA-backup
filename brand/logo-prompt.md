# پرامپت‌های ساخت لوگوی SALIRA

> این پرامپت‌ها را بدون تغییر در ابزار تصویرساز (Midjourney / DALL·E / Flux / ...) استفاده کنید.
> سبک پیشنهادی ابزار: **Flat / Vector / Minimal**. مرجع نهایی همیشه `public/logo.svg` است.

## A — App Icon (مونوگرام تنها)

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

## B — Horizontal Lockup (مونوگرام + وردمارک)

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

## Negative Prompt (اگر ابزار فیلد جدا دارد)

```
photorealistic, 3D render, bevel, emboss, heavy drop shadow, neon glow overload,
rainbow gradient, extra text, tagline, watermark, busy background, chrome effect,
gradient mesh, low contrast
```

## مشخصات خروجی و گام‌های بعد

1. آیکون: مربع **۲۰۴۸×۲۰۴۸** (ترجیحاً با پس‌زمینه‌ی تخت؛ نسخه‌ی شفاف هم اگر پشتیبانی شد)
2. لاک‌آپ: نسبت حدود **۳:۱ یا ۴:۱**
3. چند خروجی بگیرید و نزدیک‌ترین به مرجع را انتخاب کنید
4. نسخه‌ی نهایی را **وکتورسازی (trace)** کنید و در `brand/` ذخیره کنید + دو نسخه‌ی تک‌رنگ بسازید
5. جایگزینی نهایی: `public/logo.svg`، `src/app/icon.svg` و بازتولید `public/og-image.png`
   (`node scripts/make_og_image.js` پس از نصب وابستگی‌ها)
