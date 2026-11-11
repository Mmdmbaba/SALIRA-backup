#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630) — SALIRA violet-gradient identity.

Latin-only (og image is brand-facing). Persian copy lives in the app itself.
Design mirrors brand/logo.svg: obsidian-navy glass, sliced-S monogram,
violet->blue accent, letterspaced SALIRA wordmark.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
BASE = (13, 17, 38)          # #0d1126
VIOL = (124, 58, 237)        # #7C3AED
BLUE = (59, 130, 246)        # #3B82F6
TXT = (242, 244, 255)        # #F2F4FF
SUB = (154, 163, 199)        # #9AA3C7
CUT = (14, 18, 41)           # near-base for slice gaps

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

img = Image.new("RGB", (W, H), BASE)

# --- corner glows (kept away from center so slice gaps stay seamless) ---
glow = Image.new("RGB", (W, H), BASE)
gd = ImageDraw.Draw(glow)
gd.ellipse((-260, -260, 340, 340), fill=VIOL)
gd.ellipse((W - 340, H - 340, W + 260, H + 260), fill=BLUE)
glow = glow.filter(ImageFilter.GaussianBlur(180))
img = Image.blend(img, glow, 0.30)

d = ImageDraw.Draw(img)

# --- sliced-S monogram (same geometry as brand/logo.svg, scaled x7) ---
cx, s = 210, 7
r = 11 * s
c1 = (cx, 21 * s)   # top circle center  (y in 64-space * s)
c2 = (cx, 43 * s)   # bottom circle center
sw = 7 * s
def bbox(c):
    return (c[0] - r, c[1] - r, c[0] + r, c[1] + r)
d.arc(bbox(c1), start=90, end=360, fill=VIOL, width=sw)    # east->north->west->south
d.arc(bbox(c2), start=270, end=540, fill=BLUE, width=sw)   # north->east->south->west
# two slice gaps through the letter
for y64 in (19.7, 41.7):
    y = y64 * s
    d.rectangle((cx - 15 * s, y, cx + 15 * s, y + 2.6 * s), fill=CUT)

# --- wordmark: letterspaced SALIRA ---
f_word = ImageFont.truetype(FB, 148)
f_sub = ImageFont.truetype(FR, 34)
f_url = ImageFont.truetype(FM, 30)
word, track = "SALIRA", 26
widths = [d.textlength(ch, font=f_word) for ch in word]
total = sum(widths) + track * (len(word) - 1)
x = 430 + (640 - total) / 2
for ch, w in zip(word, widths):
    d.text((x, 200), ch, font=f_word, fill=TXT)
    x += w + track

# --- gradient rule under the wordmark ---
rx0, rx1, ry = 430 + 40, 430 + 600, 396
for i, x in enumerate(range(rx0, rx1, 2)):
    t = (x - rx0) / (rx1 - rx0)
    col = tuple(int(VIOL[k] + (BLUE[k] - VIOL[k]) * t) for k in range(3))
    d.rectangle((x, ry, x + 2, ry + 5), fill=col)

# --- subtitle + url (auto-fit inside the 640px wordmark column) ---
sub = "AMNEZIAWG  ·  WARP  ·  MTPROTO PROXY"
size = 32
while True:
    f_sub = ImageFont.truetype(FR, size)
    sw_ = [d.textlength(ch, font=f_sub) for ch in sub]
    if sum(sw_) + 3 * (len(sub) - 1) <= 620 or size <= 22:
        break
    size -= 2
sx = 430 + (640 - (sum(sw_) + 3 * (len(sub) - 1))) / 2
for ch, w in zip(sub, sw_):
    d.text((sx, 436), ch, font=f_sub, fill=SUB)
    sx += w + 3
url = "salira.example"
uw = d.textlength(url, font=f_url)
d.text((W - uw - 56, H - 76), url, font=f_url, fill=(105, 116, 158))

img.save("/home/z/my-project/public/og-image.png", optimize=True)
print("og-image.png written:", img.size)
