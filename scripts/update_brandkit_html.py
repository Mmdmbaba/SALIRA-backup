#!/usr/bin/env python3
"""Update SALIRA-Brand-Kit.html to v2 (final triangle-pinwheel logo).

Replaces the old sliced-S monogram SVGs with the new vector mark (generated
by scripts/build_logo.py), rewrites the logo/palette/prompt sections, and
bumps version strings. Then the PDF is re-rendered with html2pdf-next.js.
"""
import re
import sys

sys.path.insert(0, "/home/z/my-project/scripts")
import build_logo as B

HTML = "/home/z/my-project/download/SALIRA-Brand-Kit.html"


def mark_svg(width, stroke, core_fill=B.PURPLE, core_stroke=None, sw=None):
    """Standalone mark SVG sized for the kit tiles."""
    sw = sw or B.STROKES_DISPLAY
    core_stroke = core_stroke or stroke
    x0, y0, x1, y1 = B.mark_bbox()
    w = x1 - x0
    halo = B.halo_group(stroke, sw["halo"])
    core = B.core_group(core_fill, core_stroke, sw["core"])
    return (
        f'<svg width="{width}" height="{width}" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {w:.1f}" '
        f'xmlns="http://www.w3.org/2000/svg">\n    {halo}\n    {core}\n  </svg>'
    )


def replace_block(html, start_marker, end_marker, new):
    """Replace [start_marker .. end_marker] inclusive with new."""
    i = html.index(start_marker)
    j = html.index(end_marker, i) + len(end_marker)
    return html[:i] + new + html[j:]


html = open(HTML, encoding="utf-8").read()

# ── 0. title + version strings ──────────────────────────────────────────
html = html.replace("<title>برندکیت SALIRA — نسخه ۱.۰</title>",
                    "<title>برندکیت SALIRA — نسخه ۲.۰</title>")
html = html.replace('<div class="cover-kicker"><span class="latin">BRAND KIT</span> — نسخه ۱٫۰</div>',
                    '<div class="cover-kicker"><span class="latin">BRAND KIT</span> — نسخه ۲٫۰ · لوگوی نهایی</div>')
html = html.replace('<div class="foot latin">SALIRA BRAND KIT · V1.0 · NOV 2026</div>',
                    '<div class="foot latin">SALIRA BRAND KIT · V2.0 · NOV 2026</div>')

# ── 1. cover badge SVG ──────────────────────────────────────────────────
cover_svg = re.search(r'<svg width="92".*?</svg>', html, re.S).group(0)
html = html.replace(cover_svg, mark_svg(92, B.LIGHT))

# ── 2. section 02: logo description + tiles ─────────────────────────────
new_logo_desc = (
    '<p class="body-text">لوگوی سالیارا یک <b>مارک پین‌ویل مثلثی</b> است: در مرکز، یک '
    '<b>مثلث گردگوشه‌ی بنفش</b> با سوراخ منفیِ مثلثی و خط دور سرمه‌ای نشسته است که کمی پایین‌تر از '
    'مرکز ترکیب قرار می‌گیرد؛ حول آن <b>سه مثلث خطی سرمه‌ای</b> با چرخش ۱۲۰ درجه می‌چرخند و حس '
    'حرکتِ پین‌ویل ساعتگرد می‌سازند. این ترکیب «هسته‌ی ثابت + مدارِ چرخان» استعاره‌ی برند است: '
    'هسته‌ی پایدار حریم خصوصی در مرکز و سه مدار عبور آزاد پیرامون آن. خطوط به‌صورت یکنواخت و '
    'تخت رسم می‌شوند — بدون گرادیانت داخل فرم‌ها، بدون سایه و بدون افکت سه‌بعدی.</p>'
)
html = replace_block(html,
                     '<p class="body-text">لوگوی سالیارا یک <b>مونوگرام «S»',
                     'هاله‌ی بنفش ملایم پشت مونوگرام قرار می‌گیرد.</p>',
                     new_logo_desc)

tile_dark = f'''<div class="logo-tile">
      {mark_svg(96, B.LIGHT)}
    </div>'''
tile_light = f'''<div class="logo-tile light">
      {mark_svg(96, B.NAVY)}
    </div>'''
tile_word = '''<div class="logo-tile">
      <span class="logo-word">SALIRA</span>
    </div>'''

html = replace_block(html, '<div class="logo-show">', '</div>\n  </div>\n  <p class="body-text muted"',
                     '<div class="logo-show">\n    '
                     + tile_dark + '\n    ' + tile_light + '\n    ' + tile_word
                     + '\n  </div>\n  <p class="body-text muted"')
html = html.replace(
    'سه ترکیب استاندارد از راست: نشان تنها (favicon و اپ-آیکون) — لاک‌آپ روی سطح روشن — لاک‌آپ وردمارک روی سطح تیره. وردمارک فقط لاتین است و در قالب <span class="latin">Space Grotesk</span> با فاصله‌گذاری حروف حدود ۰٫۳em تنظیم می‌شود.',
    'سه ترکیب استاندارد از راست: مارک روی سطح تیره (favicon، نوبار) — مارک روی سطح روشن (مستندات چاپی) — وردمارک تنها روی تیره. وردمارک فقط لاتین است، در قالب <span class="latin">Space Grotesk 700</span> با فاصله‌گذاری حروف حدود ۲٪ تنظیم شده و به‌صورت path وکتور در فایل‌های SVG ذخیره شده است.')

html = html.replace(
    '<div class="card"><h3>فضای امن و حداقل اندازه</h3><p>دور نشان همیشه به اندازه‌ی <b>یک‌چهارم ارتفاع مونوگرام</b> فضای خالی بگذارید؛ هیچ عنصر، متن یا لبه‌ی صفحه نباید وارد این ناحیه شود. حداقل اندازه‌ی مجاز نشان <b>۲۴ پیکسل</b> در محیط دیجیتال و <b>۸ میلی‌متر</b> در چاپ است؛ زیر این اندازه‌ها فقط نسخه‌ی تک‌رنگ استفاده می‌شود تا خطوط برش خوانا بمانند.</p></div>',
    '<div class="card"><h3>فضای امن و حداقل اندازه</h3><p>دور مارک همیشه به اندازه‌ی <b>یک‌چهارم ارتفاع مارک</b> فضای خالی بگذارید؛ هیچ عنصر، متن یا لبه‌ی صفحه نباید وارد این ناحیه شود. حداقل اندازه‌ی مجاز مارک <b>۲۰ پیکسل</b> و لاک‌آپ کامل <b>۲۴ پیکسل</b> در محیط دیجیتال و <b>۸ میلی‌متر</b> در چاپ است؛ زیر این اندازه‌ها فقط نسخه‌ی تک‌رنگ یا کاشی favicon استفاده می‌شود تا خطوط نازک خوانا بمانند.</p></div>')
html = html.replace(
    '<div class="card"><h3>نسخه‌های مجاز</h3><p>رنگی روی تیره (پیش‌فرض)، رنگی روی روشن، تک‌رنگ سفید و تک‌رنگ مشکی-سرمه‌ای. در نسخه‌ی تک‌رنگ، دو کمان با همان ضخامت رسم می‌شوند و برش‌ها با رنگ پس‌زمینه ساخته می‌شوند؛ گرادیانت در هیچ حالتی با رنگ تخت جایگزین نمی‌شود مگر در تک‌رنگ‌ها.</p></div>',
    '<div class="card"><h3>نسخه‌های مجاز</h3><p>رنگی روی روشن (خطوط سرمه‌ای <span class="latin">#273842</span>)، رنگی روی تیره (خطوط روشن <span class="latin">#E9EDFB</span>)، تک‌رنگ سفید و تک‌رنگ سرمه‌ای، و کاشی favicon روی اُبیسدین. مولد پارامتریک <span class="latin">scripts/build_logo.py</span> همه‌ی نسخه‌ها را از یک هندسه‌ی واحد می‌سازد؛ هندسه را دستی ویرایش نکنید.</p></div>')

html = replace_block(html,
                     '<div class="col do"><h4>انجام بده</h4>\n      <ul>\n        <li>نسبت‌ها و زاویه‌ی گرادیانت',
                     '<li>پشت نشان سایه‌ی سنگین یا افکت سه‌بعدی اضافه نکن</li>\n      </ul>\n    </div>',
                     '''<div class="col do"><h4>انجام بده</h4>
      <ul>
        <li>هندسه و رنگ‌ها را فقط از <span class="latin">scripts/build_logo.py</span> بساز</li>
        <li>روی سطوح تیره فقط از نسخه‌ی خط‌های روشن (<span class="latin">logo-dark</span>) استفاده کن</li>
        <li>برای فضاهای کوچک از کاشی favicon (مارک روی اُبیسدین) استفاده کن</li>
        <li>وردمارک را همیشه از فایل وکتور بردار، نه با فونت دلخواه بنویس</li>
      </ul>
    </div>
    <div class="col dont"><h4>انجام نده</h4>
      <ul>
        <li>رنگ بنفش هسته یا سرمه‌ای خطوط را با رنگ دیگر عوض نکن</li>
        <li>مارک را نچرخان، مورب نکن و ضخامت خطوط را تغییر نده</li>
        <li>سوراخ منفی مرکز را پر یا جابه‌جا نکن؛ بخشی از امضای برند است</li>
        <li>پشت مارک سایه‌ی سنگین یا افکت سه‌بعدی اضافه نکن</li>
      </ul>
    </div>''')

# ── 3. palette swatches ─────────────────────────────────────────────────
html = replace_block(html,
                     '<div class="swatch"><div class="color" style="background:#7C3AED"></div>',
                     '<div class="role">انتهای گرادیانت، اکسنت ثانویه، حالت‌های اطلاع‌رسانی</div>\n    </div></div>',
                     '''<div class="swatch"><div class="color" style="background:#8B54FF"></div><div class="info">
      <div class="name">بنفش سالیارا <span class="latin" style="font-weight:400">Violet</span></div>
      <div class="hex">#8B54FF · rgb(139 84 255)</div>
      <div class="role">هسته‌ی لوگو، اکسنت اصلی تم تیره، دکمه‌ی اصلی</div>
    </div></div>
    <div class="swatch"><div class="color" style="background:#7C3AED"></div><div class="info">
      <div class="name">بنفش عمیق <span class="latin" style="font-weight:400">Deep Violet</span></div>
      <div class="hex">#7C3AED · rgb(124 58 237)</div>
      <div class="role">اکسنت اصلی تم روشن، حالت‌های hover عمیق</div>
    </div></div>
    <div class="swatch"><div class="color" style="background:#3B82F6"></div><div class="info">
      <div class="name">آبی سالیارا <span class="latin" style="font-weight:400">Blue</span></div>
      <div class="hex">#3B82F6 · rgb(59 130 246)</div>
      <div class="role">اکسنت ثانویه، انتهای گرادیانت، حالت‌های اطلاع‌رسانی</div>
    </div></div>
    <div class="swatch"><div class="color" style="background:#273842"></div><div class="info">
      <div class="name">سرمه‌ای مرکبی <span class="latin" style="font-weight:400">Navy</span></div>
      <div class="hex">#273842 · rgb(39 56 66)</div>
      <div class="role">خطوط لوگو روی سطح روشن، تک‌رنگ سرمه‌ای</div>
    </div></div>''')

html = html.replace(
    '<div class="swatch"><div class="color" style="background:linear-gradient(135deg,#7C3AED,#3B82F6)"></div><div class="info">\n      <div class="name">گرادیانت اصلی — زاویه ۱۳۵ درجه</div>\n      <div class="hex">#7C3AED → #3B82F6</div>\n      <div class="role">تنها منبع رنگ برند: لوگو، دکمه‌های اصلی، خط جداکننده</div>\n    </div></div>',
    '<div class="swatch"><div class="color" style="background:linear-gradient(120deg,#8B54FF,#6D3FD8 55%,#3B82F6)"></div><div class="info">\n      <div class="name">گرادیانت اصلی — زاویه ۱۲۰ درجه</div>\n      <div class="hex">#8B54FF → #6D3FD8 → #3B82F6</div>\n      <div class="role">دکمه‌ی اصلی، متن گرادیانتی، خط جداکننده</div>\n    </div></div>')
html = html.replace('style="flex:1.2;background:linear-gradient(135deg,#7C3AED,#3B82F6);color:#fff"',
                    'style="flex:1.2;background:linear-gradient(120deg,#8B54FF,#6D3FD8 55%,#3B82F6);color:#fff"')
html = html.replace(
    'پس‌زمینه <span class="latin">#F5F6FB</span>، سطح سفید خالص و متن سرمه‌ای <span class="latin">#0D1126</span> است؛ گرادیانت تغییری نمی‌کند.',
    'پس‌زمینه <span class="latin">#F5F6FB</span>، سطح سفید خالص و متن سرمه‌ای <span class="latin">#0D1126</span> است و اکسنت اصلی به بنفش عمیق <span class="latin">#7C3AED</span> منتقل می‌شود.')

# ── 4. typography: wordmark tracking ────────────────────────────────────
html = html.replace(
    'وردمارک همیشه با <span class="latin">letter-spacing ≈ 0.3em</span> و وزن ۷۰۰ تنظیم می‌شود.',
    'وردمارک در فایل‌های لوگو به‌صورت path وکتور ذخیره شده (Space Grotesk 700 با tracking ≈ ۲٪) و در متن‌های تخت با همان وزن و فاصله‌گذاری نوشته می‌شود.')

# ── 5. visual elements: motif + OG ──────────────────────────────────────
html = html.replace(
    '<b>موتیف برش</b>. کارت‌ها',
    '<b>موتیف چرخش</b>. کارت‌ها')
html = html.replace(
    'موتیف برش — همان دو خط افقی لوگو — در جداکننده‌ها، پس‌زمینه‌ها و تصاویر اشتراک‌گذاری تکرار می‌شود و امضای بصری برند است.',
    'موتیف چرخش — همان سه‌گانه‌ی مثلث‌های چرخیده‌ی لوگو — در جداکننده‌ها، لودرها و پس‌زمینه‌ها تکرار می‌شود و امضای بصری برند است.')
html = html.replace(
    'قالب <span class="latin">OG</span> روی اُبیسدین ساخته می‌شود: نشان برش‌خورده سمت راست، وردمارک با tracking باز، خط گرادیانتی زیر وردمارک و زیرنویس فنی. قالب مرجع: <span class="latin">scripts/make_og_image.js</span>.',
    'قالب <span class="latin">OG</span> روی اُبیسدین ساخته می‌شود: لاک‌آپ وکتور (مارک + وردمارک) در مرکز، کیکر فنی بالا و دامنه پایین، با هاله‌های بنفش/آبی در گوشه‌ها. قالب مرجع: <span class="latin">scripts/make_og_image.py</span>.')

# ── 6. prompt section: final logo prompt ────────────────────────────────
html = replace_block(html,
                     '<div class="chapter-header">\n    <div class="section-tag">07 — LOGO GENERATION PROMPT</div>',
                     'سپس <span class="latin">public/logo.svg</span> و <span class="latin">src/app/icon.svg</span> جایگزین می‌شوند.</p></div>',
                     '''<div class="chapter-header">
    <div class="section-tag">07 — LOGO GENERATION PROMPT</div>
    <div class="section-title">پرامپت ساخت لوگو</div>
    <div class="divider"></div>
  </div>
  <p class="body-text"><b>لوگوی نهایی انتخاب و وکتورسازی شده است</b> (نسخه‌ی ۲٫۰ این سند). پرامپت زیر برای تولید دوباره‌ی همان هندسه یا ساخت تنوع‌های هم‌خوان با برند نگه داشته شده است؛ خروجی ابزار تصویرساز هرگز مستقیماً جایگزین فایل‌های وکتور نمی‌شود — همیشه ابتدا با مرجع <span class="latin">brand/logo-master.svg</span> مقایسه کنید. اگر ابزار شما از پارامتر «سبک» پشتیبانی می‌کند، <span class="latin">Flat / Vector / Minimal</span> را انتخاب کنید.</p>
  <div class="prompt-label"><span class="latin">FINAL LOGO</span> — بازسازی مارک پین‌ویل + وردمارک</div>
  <pre>Minimal geometric logo mark for a privacy-tech brand. A solid rounded-corner
equilateral triangle with a small triangular negative-space hole in its center,
filled vivid violet (#8B54FF) with a thin dark-navy (#273842) outline, sitting
slightly below center. Around it, three larger hollow triangle outlines in the
same dark navy (#273842) rotate 120 degrees apart around the mark center,
slightly twisted clockwise like a pinwheel, their edges passing behind the
violet core. Flat vector style, crisp uniform strokes, off-white background
(#FFFEF8), balanced asymmetric composition, modern tech aesthetic. Below the
mark: the wordmark SALIRA in bold geometric sans-serif (Space Grotesk style),
near-black. No tagline, no extra text, no shadows, no 3D, no gradients inside
the triangles.</pre>
  <div class="prompt-label"><span class="latin">NEGATIVE PROMPT</span> — اگر ابزار شما فیلد جداگانه دارد</div>
  <pre>photorealistic, 3D render, bevel, emboss, heavy drop shadow, neon glow overload,
rainbow gradient, extra text, tagline, watermark, busy background, chrome effect,
gradient mesh, low contrast, distorted triangles, sketch lines</pre>
  <div class="card"><h3>وضعیت نهایی</h3><p>طرح تأییدشده‌ی کاربر به‌صورت پارامتریک وکتورسازی شد و همه‌ی فایل‌ها جایگزین شدند: <span class="latin">public/logo.svg</span> (روشن)، <span class="latin">public/logo-dark.svg</span> (تیره)، <span class="latin">public/logo-mark*.svg</span> (فقط مارک)، <span class="latin">src/app/icon.svg</span> (کاشی favicon) و دو تک‌رنگ در <span class="latin">brand/</span>. مولد واحد همه‌ی نسخه‌ها: <span class="latin">scripts/build_logo.py</span>.</p></div>''')

# ── 7. ending SVG + files list ──────────────────────────────────────────
end_svg = re.search(r'<svg width="84".*?</svg>', html, re.S).group(0)
html = html.replace(end_svg, mark_svg(84, B.LIGHT))
html = html.replace(
    '''<span class="latin">brand/BRAND.md</span> — نسخه‌ی متنی همین سند<br>
    <span class="latin">brand/logo-prompt.md</span> — پرامپت‌های ساخت لوگو<br>
    <span class="latin">public/logo.svg · src/app/icon.svg</span> — نشان مرجع<br>
    <span class="latin">public/og-image.png · scripts/make_og_image.js</span> — قالب اشتراک‌گذاری''',
    '''<span class="latin">brand/BRAND.md</span> — نسخه‌ی متنی همین سند<br>
    <span class="latin">brand/logo-prompt.md · brand/logo-master.svg</span> — مستند و مادر لوگو<br>
    <span class="latin">public/logo.svg · logo-dark.svg · logo-mark*.svg · src/app/icon.svg</span> — بسته‌ی نشان<br>
    <span class="latin">public/og-image.png · scripts/build_logo.py · make_og_image.py</span> — دارایی‌ها و مولدها''')

open(HTML, "w", encoding="utf-8").write(html)
print("brand kit HTML updated:", len(html), "bytes")
print("remaining old-S references:", len(re.findall(r"مونوگرام|کمان ۲۷۰", html)))
