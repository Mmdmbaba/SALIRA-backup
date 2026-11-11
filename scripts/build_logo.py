#!/usr/bin/env python3
"""Build SALIRA vector assets from the reference logo bitmap.
Mark  = geometric reconstruction (crisp polylines)
Text  = traced from 10x upscaled bitmap (faithful letterforms)
Outputs: logo.svg, logo-dark.svg, logo-mark.svg, logo-mark-dark.svg, icon.svg, og-image.png
"""
from PIL import Image
import numpy as np
import cv2
import os

SRC = '/home/z/my-project/upload/pasted_image_1794422333674.png'
OUT = '/home/z/my-project/public'

INK = '#3B3A38'        # soft black from reference
CREAM = '#FFF8EE'      # card background from reference
CREAM_DARK = '#F6E9D8' # slightly deeper cream for dark-theme logo strokes? keep simple: cream
WHITE_INK = '#FFF6E8'  # strokes on dark backgrounds

# ---------------------------------------------------------------- mark model
PATH_A = [(147,132),(139,152),(182,153),(193,124),(159,109),(172,76),(233,76),(226,99)]
PATH_B = [(188,80),(180,104),(214,118),(201,152),(191,153),(204,122),(168,105),(181,76)]
MARK_BBOX = (139, 76, 234, 153)   # x1,y1,x2,y2

def mark_paths(stroke, sw=2.0, tx=0.0, ty=0.0, s=1.0):
    """Return <path> elements for the S mark polylines."""
    out = []
    for pts in (PATH_A, PATH_B):
        d = 'M ' + ' L '.join(f'{(x+tx)*s:.2f} {(y+ty)*s:.2f}' for x, y in pts)
        out.append(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw*s:.2f}" stroke-linejoin="miter"/>')
    return '\n  '.join(out)

# ---------------------------------------------------------------- text trace
def trace_region(x1, y1, x2, y2, thresh=150, upscale=10, eps=1.1):
    """Trace dark pixels in region -> SVG path 'd' strings (evenodd subpaths)."""
    img = Image.open(SRC).convert('L')
    crop = img.crop((x1, y1, x2, y2))
    big = crop.resize((crop.width*upscale, crop.height*upscale), Image.LANCZOS)
    a = np.array(big)
    mask = (a < thresh).astype(np.uint8)*255
    mask = cv2.GaussianBlur(mask, (5,5), 0)
    _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    subs = []
    for c in contours:
        if cv2.contourArea(c) < 40:   # kill noise
            continue
        ap = cv2.approxPolyDP(c, eps, True)
        pts = ap[:,0,:].astype(float)
        pts = (pts / upscale)          # back to region coords
        d = 'M ' + ' L '.join(f'{p[0]:.2f} {p[1]:.2f}' for p in pts) + ' Z'
        subs.append(d)
    return subs

# Trace both text lines (full text block)
TEXT_BBOX = (116, 168, 256, 214)
text_subs = trace_region(*TEXT_BBOX)
print(f'traced {len(text_subs)} text contours')

def text_paths(stroke, tx, ty, s=1.0):
    """Place traced text at offset (tx,ty) with scale s, as filled subpaths.
    tx/ty = position of the TEXT_BBOX origin inside the target viewBox."""
    # single <path> with all subpaths, evenodd for holes
    d = ' '.join(text_subs)
    return (f'<path transform="translate({tx:.2f} {ty:.2f}) scale({s:.4f})" '
            f'd="{d}" fill="{stroke}" fill-rule="evenodd"/>')

# ---------------------------------------------------------------- geometry
def fit(x1,y1,x2,y2,pad):
    return (x1-pad, y1-pad, x2+pad, y2+pad)

# mark-only viewBox (square-ish)
mx1,my1,mx2,my2 = fit(*MARK_BBOX, 6)
# lockup viewBox: union of mark + text
lx1,ly1,lx2,ly2 = fit(min(MARK_BBOX[0],TEXT_BBOX[0]), MARK_BBOX[1],
                      max(MARK_BBOX[2],TEXT_BBOX[2]), TEXT_BBOX[3], 8)

def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'role="img" aria-label="SALIRA">\n  {body}\n</svg>\n')

# ---- logo-mark.svg  (mark only, ink strokes, for light backgrounds) — SQUARE viewBox for 1:1 containers
mw, mh = mx2-mx1, my2-my1
side = max(mw, mh)
mcx = (side - mw)/2   # centering offsets
mcy = (side - mh)/2
body = mark_paths(INK, sw=2.4, tx=-mx1+mcx, ty=-my1+mcy)
open(f'{OUT}/logo-mark.svg','w').write(svg(side, side, body))

# ---- logo-mark-dark.svg (cream strokes, for dark backgrounds)
body = mark_paths(WHITE_INK, sw=2.4, tx=-mx1+mcx, ty=-my1+mcy)
open(f'{OUT}/logo-mark-dark.svg','w').write(svg(side, side, body))

# ---- logo.svg (full lockup, ink) + logo-dark.svg (cream)
lw, lh = lx2-lx1, ly2-ly1
body = (mark_paths(INK, sw=1.9, tx=-lx1, ty=-ly1) + '\n  ' +
        text_paths(INK, TEXT_BBOX[0]-lx1, TEXT_BBOX[1]-ly1))
open(f'{OUT}/logo.svg','w').write(svg(lw, lh, body))

body = (mark_paths(WHITE_INK, sw=1.9, tx=-lx1, ty=-ly1) + '\n  ' +
        text_paths(WHITE_INK, TEXT_BBOX[0]-lx1, TEXT_BBOX[1]-ly1))
open(f'{OUT}/logo-dark.svg','w').write(svg(lw, lh, body))

# ---- icon.svg (favicon: cream rounded square + mark)
S = 120
m_scale = 0.74 * S / side
mw2, mh2 = mw*m_scale, mh*m_scale
ix = (S-mw2)/2; iy = (S-mh2)/2
icon_sw = 2.8 / m_scale   # effective ~2.8 units at icon scale (legible at small sizes)
body = (f'<rect width="{S}" height="{S}" rx="26" fill="{CREAM}"/>\n  '
        f'<g transform="translate({ix:.2f} {iy:.2f}) scale({m_scale:.4f}) translate({-mx1:.2f} {-my1:.2f})">\n  '
        + mark_paths(INK, sw=icon_sw, s=1) + '\n  </g>')
open('/home/z/my-project/src/app/icon.svg','w').write(svg(S, S, body))

print('SVGs written')
print('mark viewBox:', mw, mh, '| lockup viewBox:', lw, lh)

# ---------------------------------------------------------------- OG image
import cairosvg
OG_W, OG_H = 1200, 630
# lockup body (mark + text) in local coords 0..lw / 0..lh
lockup_body = (mark_paths(INK, sw=1.9, tx=-lx1, ty=-ly1) + '\n    ' +
               text_paths(INK, TEXT_BBOX[0]-lx1, TEXT_BBOX[1]-ly1))
scale = min((OG_W*0.52)/lw, (OG_H*0.78)/lh)
gx = (OG_W - lw*scale)/2
gy = (OG_H - lh*scale)/2
og = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OG_W} {OG_H}">
  <rect width="{OG_W}" height="{OG_H}" fill="{CREAM}"/>
  <rect x="28" y="28" width="{OG_W-56}" height="{OG_H-56}" fill="none" stroke="{INK}" stroke-opacity="0.15" stroke-width="2"/>
  <g transform="translate({gx:.2f} {gy:.2f}) scale({scale:.4f})">
    {lockup_body}
  </g>
</svg>
'''
open('/tmp/og.svg','w').write(og)
cairosvg.svg2png(bytestring=og.encode(), write_to=f'{OUT}/og-image.png',
                 output_width=OG_W, output_height=OG_H)
print('og-image.png written')

# ---------------------------------------------------------------- brand files (master + monos)
BR = '/home/z/my-project/brand'
def lockup_body_for(stroke):
    return (mark_paths(stroke, sw=1.9, tx=-lx1, ty=-ly1) + '\n  ' +
            text_paths(stroke, TEXT_BBOX[0]-lx1, TEXT_BBOX[1]-ly1))
open(f'{BR}/logo-master.svg','w').write(svg(lw, lh, lockup_body_for(INK)))          # master (ink)
open(f'{BR}/logo-mono-white.svg','w').write(svg(lw, lh, lockup_body_for('#FFFFFF'))) # mono white
open(f'{BR}/logo-mono-navy.svg','w').write(svg(lw, lh, lockup_body_for('#273842')))  # mono navy
print('brand master + monos written')
