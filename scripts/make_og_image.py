#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630) — SALIRA violet identity.

Composites the vector lockup (public/logo-dark.svg — pinwheel triangles +
purple core + SALIRA wordmark, light strokes) onto an obsidian-navy canvas
with violet/blue corner glows. Persian copy lives in the app itself.
"""
import cairosvg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
BASE = (13, 17, 38)          # #0d1126
VIOL = (139, 84, 255)        # #8B54FF (logo core purple)
BLUE = (59, 130, 246)        # #3B82F6
TXT = (242, 244, 255)        # #F2F4FF
SUB = (154, 163, 199)        # #9AA3C7

LOGO = "/home/z/my-project/public/logo-dark.svg"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

img = Image.new("RGB", (W, H), BASE)

# --- corner glows (kept away from the lockup area) ---
glow = Image.new("RGB", (W, H), BASE)
gd = ImageDraw.Draw(glow)
gd.ellipse((-300, -300, 320, 320), fill=VIOL)
gd.ellipse((W - 340, H - 340, W + 280, H + 280), fill=BLUE)
glow = glow.filter(ImageFilter.GaussianBlur(190))
img = Image.blend(img, glow, 0.26)

# --- vector lockup rendered at 2x for crispness ---
LH = 430  # target height for the whole lockup (mark + wordmark)
cairosvg.svg2png(url=LOGO, write_to="/tmp/og_logo.png", output_width=LH * 2 * 2)
logo = Image.open("/tmp/og_logo.png").convert("RGBA")
# trim transparent margins
bbox = logo.getbbox()
logo = logo.crop(bbox)
# fit into the target box
ratio = LH / logo.height
logo = logo.resize((int(logo.width * ratio), LH), Image.LANCZOS)
img.paste(logo, ((W - logo.width) // 2, (H - LH) // 2 + 22), logo)

# --- kicker above + url bottom-right ---
d = ImageDraw.Draw(img)
f_sub = ImageFont.truetype(FB, 24)
f_url = ImageFont.truetype(FM, 26)

sub = "AMNEZIAWG GENERATOR   ·   WARP   ·   MTPROTO PROXY"
sw = d.textlength(sub, font=f_sub)
d.text(((W - sw) / 2, 54), sub, font=f_sub, fill=SUB)

url = "salira.example"
uw = d.textlength(url, font=f_url)
d.text((W - uw - 56, H - 74), url, font=f_url, fill=(105, 116, 158))

img.save("/home/z/my-project/public/og-image.png", optimize=True)
print("og-image.png written:", img.size)
