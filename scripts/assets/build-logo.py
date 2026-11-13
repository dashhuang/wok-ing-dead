"""Draws the 守护夜排档 / Wok-ing Dead logo into public/assets/brand as self-contained SVG.

  python scripts/assets/build-logo.py <dir with the source .ttf files> public/assets/brand

Needs fonttools. The characters are outlines taken from Noto Serif SC / TC (Black) and the
English from Noto Serif Display (condensed, bold) - the same OFL sources as the interface fonts
(see build-ui-fonts.py) - so the logo needs no font at run time. The takeaway pail, the drips
off 夜 and the worn grain are drawn here. Writes logo-sc.svg (守护夜排档) and logo-tc.svg (守護夜排檔).
Direction chosen by Dash on 2026-11-14 from a generated concept (a takeaway pail beside the
title); nothing of the generated image is used.
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen

SRC, OUT = sys.argv[1], sys.argv[2]
CREAM, RED, INK = "#efe6d2", "#b8352b", "#17110f"

def inst(name, axes):
    f = TTFont(os.path.join(SRC, name))
    return instantiateVariableFont(f, axes)

def glyph(font, ch):
    gs = font.getGlyphSet(); name = font.getBestCmap()[ord(ch)]
    return gs, name, gs[name].width

def path_of(font, ch, x, y, size):
    """outline of ch with its em box's top-left at x,y, size px per em; returns d, bounds"""
    gs, name, adv = glyph(font, ch)
    upm = font["head"].unitsPerEm; s = size / upm
    asc = font["hhea"].ascent
    pen = SVGPathPen(gs)
    tp = TransformPen(pen, (s, 0, 0, -s, x, y + asc * s))
    gs[name].draw(tp)
    bp = BoundsPen(gs); gs[name].draw(TransformPen(bp, (s, 0, 0, -s, x, y + asc * s)))
    rec = RecordingPen(); gs[name].draw(TransformPen(rec, (s, 0, 0, -s, x, y + asc * s)))
    pts = [p for op, args in rec.value for p in args]
    return pen.getCommands(), bp.bounds, adv * s, pts

def drip(x, y0, length, w):
    # a run of sauce: a strand narrowing from w, ending in a round drop
    r = w * 0.9
    return (f"M{x - w/2:.1f},{y0:.1f} C{x - w/2:.1f},{y0 + length*0.35:.1f} {x - w*0.18:.1f},{y0 + length*0.55:.1f} {x - w*0.2:.1f},{y0 + length - r*1.6:.1f} "
            f"C{x - r:.1f},{y0 + length - r*0.8:.1f} {x - r:.1f},{y0 + length + r*0.9:.1f} {x:.1f},{y0 + length + r*0.9:.1f} "
            f"C{x + r:.1f},{y0 + length + r*0.9:.1f} {x + r:.1f},{y0 + length - r*0.8:.1f} {x + w*0.2:.1f},{y0 + length - r*1.6:.1f} "
            f"C{x + w*0.18:.1f},{y0 + length*0.55:.1f} {x + w/2:.1f},{y0 + length*0.35:.1f} {x + w/2:.1f},{y0:.1f} Z")

def pail(seal_font, seal_char):
    # a takeaway pail from a little above and to the left: flaps open, a heap of noodles, chopsticks
    st = f'stroke="{INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
    o = []
    # back flaps, standing open
    o.append(f'<path d="M40,205 L4,146 L118,118 L146,166 Z" fill="#d6ccb5" {st}/>')
    o.append(f'<path d="M146,166 L246,100 L372,140 L338,196 Z" fill="#d6ccb5" {st}/>')
    # chopsticks, stuck in at an angle
    o.append(f'<path d="M226,206 L292,22 L310,28 L246,212 Z" fill="{RED}" {st}/>')
    o.append(f'<path d="M252,214 L330,44 L347,52 L270,220 Z" fill="{RED}" {st}/>')
    # the heap of noodles, rising out of the opening
    o.append(f'<path d="M40,205 C46,150 96,118 150,122 C196,108 262,118 300,146 C322,160 336,178 338,196 L236,238 Z" fill="{CREAM}" {st}/>')
    for d in ["M64,196 C80,160 118,150 140,170 C160,188 190,176 196,150",
              "M88,214 C100,182 136,176 156,196 C176,214 214,206 226,176",
              "M120,140 C150,128 176,150 200,138 C226,126 252,140 270,152",
              "M150,226 C166,200 204,198 222,214",
              "M206,158 C236,150 268,168 300,170",
              "M70,176 C96,150 122,136 156,144"]:
        o.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>')
    # the pail: front and right side, narrowing to the base
    o.append(f'<path d="M40,205 L236,238 L214,468 L70,446 Z" fill="{CREAM}" {st}/>')
    o.append(f'<path d="M236,238 L338,196 L316,420 L214,468 Z" fill="#d9cfb8" {st}/>')
    # the wire-handle crimps and creases
    o.append(f'<path d="M58,226 L84,440 M220,250 L202,462" stroke="{INK}" stroke-width="2.2" fill="none" opacity=".35"/>')
    # the seal, set on the front face
    d, b, adv, _ = path_of(seal_font, seal_char, 0, 0, 60)
    w = b[2] - b[0]; h = b[3] - b[1]
    o.append(f'<g transform="translate(140 340) skewY(9) rotate(-1.5)">'
             f'<rect x="-46" y="-46" width="92" height="92" rx="8" fill="none" stroke="{RED}" stroke-width="7"/>'
             f'<path transform="translate({-b[0]-w/2:.1f} {-b[1]-h/2:.1f})" d="{d}" fill="{RED}"/></g>')
    return "\n".join(o)

def build(title, cjk_font, red_index, lat_font, seal_char, path):
    W, H = 1640, 560
    tb = None
    parts = []
    # title
    size, x, y = 236, 420, 30
    gap = 4
    title_paths, red_bounds, red_pts = [], None, []
    for i, ch in enumerate(title):
        d, b, adv, pts = path_of(cjk_font, ch, x, y, size)
        title_paths.append((d, i == red_index))
        tb = b[3] if tb is None else max(tb, b[3])
        if i == red_index: red_bounds, red_pts = b, pts
        x += adv + gap
    right = x - gap
    # the English line, with a rule either side
    lat = "WOK-ING DEAD"
    lsize, track = 82, 16
    widths = []
    for ch in lat:
        if ch == " ":
            widths.append(lsize * 0.32); continue
        _, _, adv, _ = path_of(lat_font, ch, 0, 0, lsize); widths.append(adv)
    total = sum(widths) + track * (len(lat) - 1)
    cx = (420 + right) / 2
    lx = cx - total / 2
    ly = tb + 26 - lsize * 0.14
    lat_paths = []
    gap_x = None
    for ch, wdt in zip(lat, widths):
        if ch == " ":
            gap_x = lx + wdt / 2
        if ch != " ":
            d, b, adv, _ = path_of(lat_font, ch, lx, ly, lsize); lat_paths.append(d)
        lx += wdt + track
    # drips off the red character: short ones stop above the English line, a long one
    # falls through the gap between the words
    xmin, ymin, xmax, ymax = red_bounds
    low = sorted([p for p in red_pts if p[1] > ymax - 30], key=lambda p: p[0])
    picks = []
    for p in low:
        if all(abs(p[0] - q[0]) > 36 for q in picks): picks.append(p)
    long_i = min(range(len(picks)), key=lambda i: abs(picks[i][0] - gap_x))
    drips = []
    for k, p in enumerate(picks[:4]):
        if k == long_i:
            drips.append(drip(gap_x, p[1] - 6, ly + lsize * 1.05 - p[1], 12))
        else:
            drips.append(drip(p[0], p[1] - 6, [34, 22, 42, 28][k % 4], 9))
    rule_y = ly + lsize * 0.62
    rules = (f'<rect x="420" y="{rule_y:.1f}" width="{cx - total/2 - 420 - 34:.1f}" height="4" fill="{CREAM}"/>'
             f'<rect x="{cx + total/2 + 34:.1f}" y="{rule_y:.1f}" width="{right - (cx + total/2 + 34):.1f}" height="4" fill="{CREAM}"/>')
    W = int(right + 20)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<title>{title} Wok-ing Dead</title>
<defs>
  <filter id="worn" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 5.6" result="holes"/>
    <feComposite in="SourceGraphic" in2="holes" operator="in"/>
  </filter>
  <linearGradient id="sauce" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c63c2f"/><stop offset="1" stop-color="#8f1f17"/>
  </linearGradient>
</defs>
<g filter="url(#worn)">
{pail(cjk_font, seal_char)}
{"".join(f'<path d="{d}" fill="{RED if red else CREAM}"/>' for d, red in title_paths)}
<path d="{" ".join(drips)}" fill="url(#sauce)"/>
{"".join(f'<path d="{d}" fill="{CREAM}"/>' for d in lat_paths)}
{rules}
</g>
</svg>'''
    open(path, "w").write(svg)
    print("wrote", path, W, H, "drips", len(drips))

sc = inst("NotoSerifSC[wght].ttf", {"wght": 900})
tc = inst("NotoSerifTC[wght].ttf", {"wght": 900})
lat = inst("NotoSerifDisplay[wdth,wght].ttf", {"wdth": 62.5, "wght": 700})
build("守护夜排档", sc, 2, lat, "夜", os.path.join(OUT, "logo-sc.svg"))
build("守護夜排檔", tc, 2, lat, "夜", os.path.join(OUT, "logo-tc.svg"))
