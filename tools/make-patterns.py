#!/usr/bin/env python3
# يولّد app/patterns.css: زخارف فلسطينية (تطريز النجمة ثمانية الرؤوس، غصن الزيتون، الكوفية) كصور SVG مضمَّنة تعمل دون إنترنت
from urllib.parse import quote
import math
PAL = {
 'light': dict(r='#A21008', g='#E6A901', o='#4f6f2c', k='#2a2323', ol='#3a2236', p='#FF9798', net='rgba(60,30,25,.12)', wave='rgba(162,16,8,.07)'),
 'dark':  dict(r='#e0574c', g='#E6A901', o='#93b86d', k='#e6dcd8', ol='#6b4a62', p='#c97b7c', net='rgba(255,235,225,.10)', wave='rgba(230,169,1,.08)'),
}
def uri(svg): return 'url("data:image/svg+xml,' + quote(svg, safe="/:=' ()+,;-.") .replace('"', "'") + '")'
def svg(w, h, body): return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>{body}</svg>"

def star_cells(N=13):
    c = N // 2; cells = {}
    inside = lambda x, y: abs(x - c) + abs(y - c) <= 6 or max(abs(x - c), abs(y - c)) <= 4
    for y in range(N):
        for x in range(N):
            if not inside(x, y): continue
            dx, dy = x - c, y - c; d = abs(dx) + abs(dy)
            edge = any(not inside(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if dx == 0 and dy == 0: col = 'r'
            elif edge: col = 'r'
            elif d == 1 or d == 2: col = 'g'
            elif d == 3: col = 'k'
            elif d % 2 == 0: col = 'g'
            else: col = 'o'
            cells[(x, y)] = col
    return cells
def rects(cells, p, ox, oy, pal, gap=.35):
    return ''.join(f"<rect x='{ox + x * p:.2f}' y='{oy + y * p:.2f}' width='{p - gap:.2f}' height='{p - gap:.2f}' fill='{pal[col]}'/>" for (x, y), col in cells.items())
def star(p, pal, pad=0): return svg(int(13 * p) + 2 * pad, int(13 * p) + 2 * pad, rects(star_cells(), p, pad, pad, pal))

def band_star(pal, p=2):   # شريط نجوم تطريز بينها معيّنات صغيرة
    cells = star_cells(); w = 13 * p; gap = 7 * p; H = 13 * p + 8
    b = rects(cells, p, 0, 4, pal)
    dm = {}
    for (x, y) in [(3, 0), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (2, 3), (3, 3), (4, 3), (3, 4)]: dm[(x, y)] = 'g'
    # معيّن صغير (5×5) في الفاصل
    small = {(2, 0): 'g', (1, 1): 'r', (2, 1): 'g', (3, 1): 'r', (0, 2): 'g', (1, 2): 'g', (2, 2): 'r', (3, 2): 'g', (4, 2): 'g', (1, 3): 'r', (2, 3): 'g', (3, 3): 'r', (2, 4): 'g'}
    b += rects(small, p, w + (gap - 5 * p) / 2, 4 + (13 * p - 5 * p) / 2, pal)
    b += f"<rect x='0' y='0' width='{w + gap}' height='2' fill='{pal['r']}' opacity='.85'/><rect x='0' y='{H - 2}' width='{w + gap}' height='2' fill='{pal['r']}' opacity='.85'/>"
    return svg(w + gap, H, b)

def band_zig(pal):   # حد ضيّق: مثلثات متقابلة بألوان العلم
    W, H = 24, 10
    b = f"<rect width='{W}' height='2' y='0' fill='{pal['k']}' opacity='.9'/><rect width='{W}' height='2' y='{H-2}' fill='{pal['o']}'/>"
    b += f"<path d='M0 2 L6 8 L12 2 L18 8 L24 2' fill='none' stroke='{pal['r']}' stroke-width='2'/><rect x='5' y='3.2' width='2' height='2' fill='{pal['g']}'/><rect x='17' y='3.2' width='2' height='2' fill='{pal['g']}'/>"
    return svg(W, H, b)

def bez(t, P):
    a = (1 - t) ** 3; b = 3 * (1 - t) ** 2 * t; c = 3 * (1 - t) * t ** 2; d = t ** 3
    x = a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0]; y = a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]
    dx = 3 * (1 - t) ** 2 * (P[1][0] - P[0][0]) + 6 * (1 - t) * t * (P[2][0] - P[1][0]) + 3 * t ** 2 * (P[3][0] - P[2][0])
    dy = 3 * (1 - t) ** 2 * (P[1][1] - P[0][1]) + 6 * (1 - t) * t * (P[2][1] - P[1][1]) + 3 * t ** 2 * (P[3][1] - P[2][1])
    return x, y, math.degrees(math.atan2(dy, dx))
def olive(pal, W=260, H=130, opacity=1):
    P = [(8, 108), (80, 116), (150, 56), (250, 38)]
    body = f"<g opacity='{opacity}'><path d='M{P[0][0]} {P[0][1]} C{P[1][0]} {P[1][1]} {P[2][0]} {P[2][1]} {P[3][0]} {P[3][1]}' fill='none' stroke='{pal['k']}' stroke-width='2' stroke-linecap='round' opacity='.75'/>"
    leaf = lambda L, s: f"<path d='M0 0 C{L*.25} {-s} {L*.75} {-s} {L} 0 C{L*.75} {s} {L*.25} {s} 0 0Z' fill='{pal['o']}'/><path d='M1 0 L{L-2} 0' stroke='{pal['k']}' stroke-width='.6' opacity='.35'/>"
    n = 9
    for i in range(n):
        t = .08 + i * (.86 / (n - 1)); x, y, a = bez(t, P); L = 30 - i * 1.6; s = 6.5 - i * .3
        for side in (-1, 1):
            body += f"<g transform='translate({x:.1f} {y:.1f}) rotate({a + side * 48:.1f})'>{leaf(L, s)}</g>"
    x, y, a = bez(1, P); body += f"<g transform='translate({x:.1f} {y:.1f}) rotate({a:.1f})'>{leaf(30, 7)}</g>"
    for t in (.3, .5, .72):
        x, y, a = bez(t, P); body += f"<ellipse cx='{x:.1f}' cy='{y + 9:.1f}' rx='4.6' ry='6' fill='{pal['ol']}'/><ellipse cx='{x - 1.2:.1f}' cy='{y + 7:.1f}' rx='1.3' ry='2' fill='#fff' opacity='.45'/><path d='M{x:.1f} {y:.1f} L{x:.1f} {y + 4:.1f}' stroke='{pal['k']}' stroke-width='1'/>"
    return svg(W, H, body + '</g>')

def keffiyeh(pal):   # شبكة الصيد + خطوط متعرجة (نمط الكوفية)
    W = 36
    b = f"<path d='M0 {W/2} L{W/2} 0 L{W} {W/2} L{W/2} {W} Z' fill='none' stroke='{pal['net']}' stroke-width='1'/>"
    b += f"<rect x='{W/2-1.5}' y='{W/2-1.5}' width='3' height='3' fill='{pal['net']}'/><rect x='-1.5' y='-1.5' width='3' height='3' fill='{pal['net']}'/><rect x='{W-1.5}' y='-1.5' width='3' height='3' fill='{pal['net']}'/><rect x='-1.5' y='{W-1.5}' width='3' height='3' fill='{pal['net']}'/><rect x='{W-1.5}' y='{W-1.5}' width='3' height='3' fill='{pal['net']}'/>"
    return svg(W, W, b)
def waves(pal):
    return svg(120, 24, f"<path d='M0 12 Q10 0 20 12 T40 12 T60 12 T80 12 T100 12 T120 12' fill='none' stroke='{pal['wave']}' stroke-width='2'/>")

def frond(P, n, Lmax, s, spread, col, op):   # سعفة نخيل: عرق رئيسي منحنٍ ووريقات رفيعة متقابلة
    d = f"<path d='M{P[0][0]} {P[0][1]} C{P[1][0]} {P[1][1]} {P[2][0]} {P[2][1]} {P[3][0]} {P[3][1]}' fill='none' stroke='{col}' stroke-width='1.3' stroke-linecap='round' stroke-opacity='{op}'/>"
    for i in range(n):
        t = .12 + i * (.84 / (n - 1)); x, y, a = bez(t, P); L = Lmax * (1 - abs(t - .45) * 1.1); sw = s
        for side in (-1, 1):
            d += f"<g transform='translate({x:.1f} {y:.1f}) rotate({a + side * spread:.1f})'><path d='M0 0 C{L*.3:.1f} {-sw} {L*.7:.1f} {-sw*.7:.1f} {L:.1f} 0 C{L*.7:.1f} {sw*.7:.1f} {L*.3:.1f} {sw} 0 0Z' fill='{col}' fill-opacity='{op}'/></g>"
    return d
def olive_sprig(P, n, L, s, col, op):   # غصن زيتون بأوراق عريضة نسبيًا
    d = f"<path d='M{P[0][0]} {P[0][1]} C{P[1][0]} {P[1][1]} {P[2][0]} {P[2][1]} {P[3][0]} {P[3][1]}' fill='none' stroke='{col}' stroke-width='1.1' stroke-linecap='round' stroke-opacity='{op}'/>"
    for i in range(n):
        t = .1 + i * (.8 / (n - 1)); x, y, a = bez(t, P)
        for side in (-1, 1):
            d += f"<g transform='translate({x:.1f} {y:.1f}) rotate({a + side * 52:.1f})'><path d='M0 0 C{L*.25:.1f} {-s} {L*.75:.1f} {-s} {L} 0 C{L*.75:.1f} {s} {L*.25:.1f} {s} 0 0Z' fill='{col}' fill-opacity='{op}'/></g>"
    x, y, a = bez(1, P); d += f"<g transform='translate({x:.1f} {y:.1f}) rotate({a:.1f})'><path d='M0 0 C{L*.25:.1f} {-s} {L*.75:.1f} {-s} {L} 0 C{L*.75:.1f} {s} {L*.25:.1f} {s} 0 0Z' fill='{col}' fill-opacity='{op}'/></g>"
    return d
def leafy(col, op, W=260):   # بلاط نخيل وزيتون بنصف إزاحة، يتكرر بسلاسة
    b = ''
    for dx, dy in ((0, 0),):
        b += f"<g transform='translate({dx} {dy})'>"
        b += frond([(34, 130), (66, 56), (122, 36), (170, 76)], 11, 34, 4.2, 38, col, op)           # سعفة
        b += olive_sprig([(130, 246), (165, 195), (200, 180), (226, 140)], 7, 20, 5.2, col, op)    # غصن زيتون
        b += olive_sprig([(36, 244), (28, 214), (54, 192), (84, 190)], 4, 15, 3.8, col, op)          # غصيْن
        b += '</g>'
    return svg(W, W, b)
out = ['/* مولَّد بـ tools/make-patterns.py — لا تعدّله يدويًا */']
NONE = 'linear-gradient(transparent,transparent)'
LEAF = {'light': ('#4f6f2c', .075), 'dark': ('#93b86d', .07)}
for name, sel in (('light', ':root'), ('dark', ':root[data-theme="dark"]')):
    pal = PAL[name]; col, op = LEAF[name]
    out.append(f"{sel}{{--p-keff:{uri(leafy(col, op))};--p-wave:{NONE};--p-band-star:{uri(band_star(pal))};--p-band-zig:{uri(band_zig(pal))};--p-star:{uri(star(1.7, pal))};--p-star-s:{uri(star(1.15, pal))};--p-olive:{uri(olive(pal))};--p-olive-w:{uri(olive(pal, opacity=.5))}}}")
out.append(f":root{{--p-band-star-l:{uri(band_star(PAL['light']))};--p-olive-l:{uri(olive(PAL['light']))}}}")
out.append(f":root{{--p-keff-w:{uri(leafy('#ffffff', .075))};--p-stars-w:{NONE}}}")
open('app/patterns.css', 'w', encoding='utf8').write('\n'.join(out) + '\n')
# معاينة
open('/tmp/pat_preview.html', 'w', encoding='utf8').write(''.join(f"<div style='display:flex;gap:20px;align-items:center;padding:10px;background:{bg}'>{svg_}</div>" for bg, svg_ in [('#fff', star(4, PAL['light'])+olive(PAL['light'])+band_star(PAL['light'], 3)+band_zig(PAL['light'])), ('#1b1415', star(4, PAL['dark'])+olive(PAL['dark'])+band_star(PAL['dark'], 3)+band_zig(PAL['dark']))]))
print('ok')
