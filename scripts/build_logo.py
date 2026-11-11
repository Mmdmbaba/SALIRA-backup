#!/usr/bin/env python3
"""Vectorize the approved SALIRA logo artwork (user-provided AI render).

Geometry (clean C3 interpretation of the artwork):
  - Core: rounded triangular BAND, purple fill, navy stroke, negative hole.
  - Halo: 3 stroke-only rounded triangles rotated 120 deg apart (pinwheel).
  - Wordmark: SALIRA, Space Grotesk 700, converted to SVG paths (no fonts).

Outputs:
  public/logo.svg            master lockup  (light backgrounds: navy strokes)
  public/logo-dark.svg       lockup for dark surfaces (light strokes)
  public/logo-mark.svg       mark only, light-bg palette
  public/logo-mark-dark.svg  mark only, dark-bg palette
  src/app/icon.svg           favicon: mark on obsidian rounded tile
  brand/logo-master.svg      repo copy of master lockup
  brand/logo-mono-white.svg  mono white lockup
  brand/logo-mono-navy.svg   mono navy lockup
"""
import math
import os

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── palette (sampled from approved artwork + brand doc) ─────────────────
PURPLE = "#8B54FF"   # core fill (artwork sample)
NAVY   = "#273842"   # strokes on light (artwork sample)
INK    = "#0D1420"   # wordmark on light (near-black navy)
LIGHT  = "#E9EDFB"   # strokes on dark
LIGHTW = "#F2F4FF"   # wordmark on dark
OBSID  = "#0D1126"   # favicon tile

# ── mark geometry constants (viewBox space; measured from artwork) ──────
CX, CY = 60.0, 60.0          # halo orbit center
CORE_DY = 17.0               # core sits BELOW the halo center (artwork trick:
                             # crossing lines hide behind the band, hole stays clean)
CORE_R   = 38.9              # core outer circumradius (artwork: 53% width)
CORE_HR  = 15.8              # core hole circumradius
CORE_CR  = 8.0               # core outer corner radius
CORE_HCR = 3.0               # hole corner radius
HALO_R      = 39.1           # halo triangle circumradius
HALO_CR     = 3.5            # halo corner radius (sharp, like artwork)
HALO_TWIST  = 8.0            # pinwheel twist (deg, clockwise)
HALO_LIFT   = 19.7           # orbit radius: halo center offset from mark center
WORD_W      = 118.0          # wordmark target width
WORD_TRACK_EM = 0.02         # tracking between letters (tight, like artwork)
WORD_FATTEN = 0.8            # same-color stroke that fattens the wordmark
WORD_GAP = 15.0              # gap mark→wordmark

# stroke weight profiles (display vs favicon)
STROKES_DISPLAY = {"core": 1.8, "halo": 1.3}
STROKES_ICON    = {"core": 3.2, "halo": 2.2}


def tri_pts(cx, cy, r, rot_deg=0.0):
    """Equilateral triangle vertices, apex up, SVG coords (y down)."""
    pts = []
    for a in (-90.0 + rot_deg, 30.0 + rot_deg, 150.0 + rot_deg):
        rad = math.radians(a)
        pts.append((cx + r * math.cos(rad), cy + r * math.sin(rad)))
    return pts


def rounded_poly(pts, r):
    """Closed path with circular corner arcs. Assumes convex polygon."""
    n = len(pts)
    d = []
    segs = []
    for i in range(n):
        p_prev = pts[(i - 1) % n]
        p = pts[i]
        p_next = pts[(i + 1) % n]
        v1 = (p_prev[0] - p[0], p_prev[1] - p[1])
        v2 = (p_next[0] - p[0], p_next[1] - p[1])
        l1 = math.hypot(*v1)
        l2 = math.hypot(*v2)
        u1 = (v1[0] / l1, v1[1] / l1)
        u2 = (v2[0] / l2, v2[1] / l2)
        # interior angle between edges
        dot = max(-1.0, min(1.0, u1[0] * u2[0] + u1[1] * u2[1]))
        theta = math.acos(dot)
        t = r / math.tan(theta / 2.0)
        t = min(t, l1 * 0.49, l2 * 0.49)
        start = (p[0] + u1[0] * t, p[1] + u1[1] * t)
        end = (p[0] + u2[0] * t, p[1] + u2[1] * t)
        segs.append((start, p, end))
        # sweep: cross of u1->u2 (y-down coords): negative cross = convex
        # corner for a clockwise-walked polygon → arc bulges outward with 1
        cross = u1[0] * u2[1] - u1[1] * u2[0]
        segs[-1] = (start, p, end, 1 if cross < 0 else 0)
    (s0, _, _, _) = segs[0]
    d.append(f"M{s0[0]:.3f} {s0[1]:.3f}")
    for i, (start, p, end, sweep) in enumerate(segs):
        nxt = segs[(i + 1) % n][0]
        d.append(f"L{start[0]:.3f} {start[1]:.3f}" if i > 0 else "")
        d.append(f"A{r:.3f} {r:.3f} 0 0 {sweep} {end[0]:.3f} {end[1]:.3f}")
        d.append(f"L{nxt[0]:.3f} {nxt[1]:.3f}" if i + 1 < n else "")
    d.append("Z")
    return " ".join(x for x in d if x)


def core_band_paths():
    cy_core = CY + CORE_DY
    outer = rounded_poly(tri_pts(CX, cy_core, CORE_R), CORE_CR)
    hole = rounded_poly(tri_pts(CX, cy_core, CORE_HR), CORE_HCR)
    return outer, hole


def halo_group(stroke, stroke_weight):
    """3 stroke-only triangles orbiting the mark center (C3 pinwheel).

    Each copy: the base triangle (built about its own center, which sits
    HALO_LIFT above the mark center) rotated 120k deg about the MARK center.
    Rotating about the triangle's own center would map it onto itself.
    """
    parts = []
    for k in range(3):
        pts = tri_pts(CX, CY - HALO_LIFT, HALO_R, rot_deg=HALO_TWIST)
        a = math.radians(120.0 * k)
        ca, sa = math.cos(a), math.sin(a)
        rotated = []
        for (x, y) in pts:
            dx, dy = x - CX, y - CY
            rotated.append((CX + dx * ca - dy * sa, CY + dx * sa + dy * ca))
        parts.append(
            f'<path d="{rounded_poly(rotated, HALO_CR)}" fill="none" '
            f'stroke="{stroke}" stroke-width="{stroke_weight}" '
            f'stroke-linejoin="round"/>'
        )
    return "\n    ".join(parts)


def core_group(fill, stroke, stroke_weight):
    outer, hole = core_band_paths()
    return (
        f'<path d="{outer} {hole}" fill="{fill}" fill-rule="evenodd" '
        f'stroke="{stroke}" stroke-width="{stroke_weight}" '
        f'stroke-linejoin="round"/>'
    )


def mark_bbox():
    """Bbox of the mark incl. strokes (halo reach vs low core)."""
    r_halo = HALO_R + HALO_LIFT + STROKES_DISPLAY["halo"]
    r_core = CORE_R + CORE_DY + STROKES_DISPLAY["core"]
    r_max = max(r_halo, r_core)
    return (CX - r_halo, CY - r_halo, CX + r_halo, CY + r_max)


# ── wordmark ─────────────────────────────────────────────────────────────
FONT_PATH = os.path.join(ROOT, "download/fonts/spacegrotesk-700.ttf")
WORD = "SALIRA"


def wordmark_paths(scale_to_width):
    font = TTFont(FONT_PATH)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    cap = getattr(font["OS/2"], "sCapHeight", int(0.7 * upm))
    track = WORD_TRACK_EM * upm

    names = [cmap[ord(c)] for c in WORD]
    widths = [gs[n].width for n in names]
    total_units = sum(widths) + track * (len(names) - 1)
    s = scale_to_width / total_units

    parts, x = [], 0.0  # x accumulates in SCALED pixels
    for name, adv in zip(names, widths):
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, Transform(s, 0, 0, -s, x, 0))
        gs[name].draw(tp)
        d = pen.getCommands()
        if d:
            parts.append(d)
        x += (adv + track) * s
    return " ".join(parts), cap * s, s * upm


# ── builders ─────────────────────────────────────────────────────────────
def build_lockup(stroke, word_color, core_fill=PURPLE, sw=STROKES_DISPLAY):
    wm_d, cap_h, font_px = wordmark_paths(WORD_W)
    x0, y0, x1, y1 = mark_bbox()
    pad = 4.0
    w = max(x1 - x0, WORD_W + 2 * pad)
    cx_off = (w - (x1 - x0)) / 2.0  # center mark inside canvas
    baseline = y1 + WORD_GAP + cap_h
    vh = math.ceil(baseline + cap_h * 0.12)
    wm_x = (w - WORD_W) / 2.0
    fatten = WORD_FATTEN * 100.0 / font_px
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {vh}" role="img" aria-label="SALIRA">
  <g transform="translate({cx_off - x0:.3f} 0)">
    {halo_group(stroke, sw["halo"])}
    {core_group(core_fill, stroke, sw["core"])}
    <g transform="translate({wm_x:.3f} {baseline:.3f})">
      <path d="{wm_d}" fill="{word_color}" stroke="{word_color}" stroke-width="{fatten:.3f}" stroke-linejoin="round"/>
    </g>
  </g>
</svg>
'''


def build_mark(stroke, core_fill=PURPLE, sw=STROKES_DISPLAY):
    x0, y0, x1, y1 = mark_bbox()
    w = x1 - x0
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {w:.0f}" role="img" aria-label="SALIRA mark">
  <g transform="translate({-x0:.3f} {-y0:.3f})">
    {halo_group(stroke, sw["halo"])}
    {core_group(core_fill, stroke, sw["core"])}
  </g>
</svg>
'''


def build_icon():
    x0, y0, x1, y1 = mark_bbox()
    w = x1 - x0
    tile = 120.0
    m_scale = 0.74 * tile / w
    off = (tile - w * m_scale) / 2.0
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {tile:.0f} {tile:.0f}">
  <rect width="{tile:.0f}" height="{tile:.0f}" rx="26" fill="{OBSID}"/>
  <g transform="translate({off:.3f} {off:.3f}) scale({m_scale:.5f})">
    {halo_group(LIGHT, STROKES_ICON["halo"])}
    {core_group(PURPLE, LIGHT, STROKES_ICON["core"])}
  </g>
</svg>
'''


def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print("wrote", path, len(content), "bytes")


if __name__ == "__main__":
    write("public/logo.svg", build_lockup(NAVY, INK))
    write("public/logo-dark.svg", build_lockup(LIGHT, LIGHTW))
    write("public/logo-mark.svg", build_mark(NAVY))
    write("public/logo-mark-dark.svg", build_mark(LIGHT))
    write("src/app/icon.svg", build_icon())
    write("brand/logo-master.svg", build_lockup(NAVY, INK))
    write("brand/logo-mono-white.svg", build_lockup("#FFFFFF", "#FFFFFF"))
    write("brand/logo-mono-navy.svg", build_lockup(NAVY, NAVY))
    # previews for visual QA
    import cairosvg
    prev = {
        "logo.svg": "#FFFEF8",
        "logo-dark.svg": OBSID,
        "logo-mono-navy.svg": "#FFFEF8",
        "logo-mono-white.svg": OBSID,
        "icon.svg": None,
        "logo-mark.svg": "#FFFEF8",
        "logo-mark-dark.svg": OBSID,
    }
    os.makedirs("/tmp/logo_preview", exist_ok=True)
    for name, bg in prev.items():
        src = os.path.join(ROOT, "public", name)
        if not os.path.exists(src):
            src = os.path.join(ROOT, "brand", name)
        if not os.path.exists(src):
            src = os.path.join(ROOT, "src", "app", name)
        out = f"/tmp/logo_preview/{name.replace('.svg', '')}.png"
        kw = {"output_width": 480}
        if bg:
            cairosvg.svg2png(url=src, write_to=out, background_color=bg, **kw)
        else:
            cairosvg.svg2png(url=src, write_to=out, **kw)
        print("preview", out)
