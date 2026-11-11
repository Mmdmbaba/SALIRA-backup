# لوگوی SALIRA — وضعیت نهایی و پرامپت‌ها

> **وضعیت: نهایی شد (v3).** کاربر تصویر مرجع لوگو را ارسال کرد (`upload/pasted_image_1794422333674.png`، 2026-11-12):
> حرف S زاویه‌دارِ خط‌دوختِ مرکّی روی کارت کرم با وردمارک `SALIRA` و `SINCE 2026`.
> مارک به‌صورت پارامتریک بازسازی و وردمارک‌ها از خود تصویر تریس شدند.
> مرجع رسمی: `brand/logo-master.svg` و `public/logo.svg`.

## مشخصات فنی لوگوی نهایی

| بخش | شرح |
|---|---|
| مارک | S زاویه‌دار از **دو مسیر شکستهٔ پیوسته** (بدون پرشدگی، فقط خط). مسیر اصلی ۸ نقطه: `(147,132)→(139,152)→(182,153)→(193,124)→(159,109)→(172,76)→(233,76)→(226,99)` در دستگاه مختصات طرح مرجع (خانوادهٔ y به پایین)؛ مسیر دوم موازی و کوچکتر: `(188,80)→(180,104)→(214,118)→(201,152)→(191,153)→(204,122)→(168,105)→(181,76)` |
| ریتم | خطوط موازی با گام ثابت ~۹-۱۱ واحد — افکت «دوخت/راه‌پله»؛ دو انتهای مسیر اصلی (بالا-راست و پایین-چپ) باز می‌مانند |
| هندسه | فقط خط راست؛ گوشه‌های تیز (miter)؛ ضخامت خط مرکّی ≈ ۲ واحد در مختصات مرجع |
| رنگ‌ها | خطوط و متن: مرکّی `#3B3A38`؛ زمینهٔ برند: کرم `#FFF8EE`؛ نسخهٔ تیره: خطوط کرم `#FFF6E8` |
| وردمارک | `SALIRA` (حروف بزرگ، tracking باز) + `SINCE 2026` (ایتالیک) — تریس‌شده از تصویر مرجع، بدون وابستگی به فونت |
| نسبت | مارک ≈ ۹۵×۷۷؛ لاک‌آپ ≈ ۱۵۶×۱۵۴ (تقریباً مربع)؛ وردمارک کمی پهن‌تر از مارک |

### فایل‌ها

- `public/logo.svg` — لاک‌آپ برای پس‌زمینه‌ی روشن (خطوط مرکّی)
- `public/logo-dark.svg` — لاک‌آپ برای پس‌زمینه‌ی تیره (خطوط کرم `#FFF6E8`)
- `public/logo-mark.svg` / `public/logo-mark-dark.svg` — فقط مارک، viewBox مربعی (نوبار/فوتر/هدر اپ)
- `src/app/icon.svg` — favicon: مارک روی کاشی کرم گردگوشه `#FFF8EE`
- `brand/logo-mono-white.svg` / `brand/logo-mono-navy.svg` — تک‌رنگ‌ها
- `brand/logo-master.svg` — نسخه‌ی مادر
- `public/og-image.png` — کارت اشتراک‌گذاری ۱۲۰۰×۶۳۰ روی کرم با قاب ظریف
- `scripts/build_logo.py` — مولد پارامتریک؛ هر تغییر هندسه/رنگ از همین فایل

### پرامپت بازتولید مارک (برای تنوع یا نسخه‌های مشابه)

```
Minimal geometric logo mark for a privacy-tech brand: an angular letter S built
from two continuous thin black zigzag polylines (outline style, no fill) on a
warm cream background (#FFF8EE). The S is made of straight segments only, with
sharp miter corners: a long top bar, a steep left diagonal, a shallow middle
diagonal, a steep right diagonal and a long bottom bar; a second parallel
polyline runs alongside it one step inward, creating a stitched,
double-line staircase rhythm with constant spacing. Both ends of the main
zigzag stay open and cut at an angle. Soft black ink (#3B3A38) lines, flat
vector style, elegant fashion-minimal aesthetic, no gradients, no shadows,
no rounded corners. Below the mark: the wordmark SALIRA in spaced uppercase
geometric sans-serif with the line "SINCE 2026" in italic beneath it.
```

Negative prompt:

```
photorealistic, 3D render, drop shadow, neon glow, rainbow gradient, extra text,
tagline, watermark, busy background, chrome effect, rounded line caps, curves,
serif letters, low contrast, distorted geometry, sketch lines
```

---

## آرشیو — نسخه‌های پیشین

### v2 — طرح پین‌ویل مثلثی (منسوخ 2026-11-12)

مثلث گردگوشهٔ بنفش با ۳ مثلث خطی چرخیده؛ توسط ابزار تصویرساز تولید و موقتاً نهایی شد،
سپس کاربر طرح خطی S را جایگزین کرد. پرامپت آن نسخه در تاریخچه‌ی گیت (`brand/logo-prompt.md` بازنگری قبلی) موجود است.

### v1 — مونوگرام S گرادیانتی (منسوخ)

دو کمان ۲۷۰ درجه با گرادیانت بنفش→آبی و دو برش افقی؛ هرگز به فایل‌های سایت راه نیافت.
