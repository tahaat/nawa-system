#!/usr/bin/env python3
"""يحوّل قوالب كشوف الحضور (Word) إلى قوالب HTML طبق الأصل: الأبعاد، الخطوط، الألوان، الحدود، الدمج، الهيدر والفوتر والشعار.
الاستخدام: python3 tools/docx2tpl.py <dir-with-docx> <out.json>"""
import sys, zipfile, json, base64, re, glob, os
from lxml import etree
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'; WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'; R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
ns = {'w': W, 'wp': WP, 'a': A}
q = lambda t: '{%s}%s' % (W, t)
def v(el, name, attr='val'):
    if el is None: return None
    c = el.find('w:' + name, ns); return None if c is None else c.get(q(attr))
px = lambda tw: round(float(tw) / 15, 2)          # twips → px (96dpi)
pt = lambda hp: float(hp) / 2

class Doc:
    def __init__(s, path):
        s.z = zipfile.ZipFile(path); s.doc = etree.fromstring(s.z.read('word/document.xml')); s.styles = etree.fromstring(s.z.read('word/styles.xml'))
        s.rels = {}
        for part in ['document', 'header1', 'footer1']:
            n = f'word/_rels/{part}.xml.rels'
            if n in s.z.namelist(): s.rels[part] = {r.get('Id'): r.get('Target') for r in etree.fromstring(s.z.read(n))}
        s.cur = 'document'; s.dstyle = {}
        for st in s.styles.findall('w:style', ns):
            s.dstyle[st.get(q('styleId'))] = st
        dd = s.styles.find('w:docDefaults', ns); s.defsz = None
        if dd is not None:
            sz = dd.find('.//w:rPr/w:sz', ns); s.defsz = sz.get(q('val')) if sz is not None else None
    def style_chain(s, sid):
        out = []
        while sid and sid in s.dstyle:
            st = s.dstyle[sid]; out.append(st); b = st.find('w:basedOn', ns); sid = b.get(q('val')) if b is not None else None
        return out[::-1]
    # ---- run / paragraph properties
    def rpr_css(s, rpr, base=None):
        c = dict(base or {})
        if rpr is None: return c
        f = rpr.find('w:rFonts', ns)
        if f is not None:
            fam = f.get(q('cs')) or f.get(q('ascii')) or f.get(q('hAnsi'))
            if fam: c['font-family'] = fam
        if rpr.find('w:b', ns) is not None and v(rpr, 'b') not in ('0', 'false'): c['font-weight'] = '700'
        elif rpr.find('w:bCs', ns) is not None and v(rpr, 'bCs') not in ('0', 'false'): c['font-weight'] = '700'
        if rpr.find('w:i', ns) is not None and v(rpr, 'i') not in ('0', 'false'): c['font-style'] = 'italic'
        elif rpr.find('w:iCs', ns) is not None and v(rpr, 'iCs') not in ('0', 'false'): c['font-style'] = 'italic'
        sz = rpr.find('w:szCs', ns) if rpr.find('w:szCs', ns) is not None else rpr.find('w:sz', ns)
        if sz is not None: c['font-size'] = f"{pt(sz.get(q('val')))}pt"
        col = v(rpr, 'color')
        if col and col != 'auto': c['color'] = '#' + col
        hl = v(rpr, 'highlight')
        if hl: c['background'] = {'yellow': '#ffff00', 'green': '#00ff00', 'cyan': '#00ffff', 'lightGray': '#d3d3d3'}.get(hl, hl)
        u = v(rpr, 'u')
        if u and u != 'none': c['text-decoration'] = 'underline'
        if rpr.find('w:strike', ns) is not None: c['text-decoration'] = 'line-through'
        sh = rpr.find('w:shd', ns)
        if sh is not None and sh.get(q('fill')) not in (None, 'auto'): c['background'] = '#' + sh.get(q('fill'))
        return c
    def run_html(s, r, base):
        if any(a.tag in (q('del'),) for a in r.iterancestors()): return ''
        if r.find('w:rPr/w:vanish', ns) is not None: return ''
        if any(a.tag in (q('txbxContent'), '{%s}Fallback' % MC, q('pict')) for a in r.iterancestors()): return ''
        css = s.rpr_css(r.find('w:rPr', ns), base); out = ''
        for ch in r:
            t = etree.QName(ch).localname
            if t == 't': out += esc(ch.text or '')
            elif t == 'tab': out += '<span class="tab"></span>'
            elif t == 'br': out += '<br>'
            elif t == 'sym':
                out += '☐'
            elif t == 'drawing': out += s.drawing(ch)
        if not out: return ''
        st = ';'.join(f'{k}:{x}' for k, x in css.items())
        return f'<span style="{st}">{out}</span>'
    def drawing(s, d):
        anc = d.find('wp:anchor', ns); inl = d.find('wp:inline', ns); node = anc if anc is not None else inl
        if node is None: return ''
        ext = node.find('wp:extent', ns); wpx = int(ext.get('cx')) / 9525; hpx = int(ext.get('cy')) / 9525
        blip = node.find('.//a:blip', ns); rid = blip.get('{%s}embed' % R) if blip is not None else None
        if not rid: return ''
        tgt = s.rels.get(s.cur, {}).get(rid); 
        if not tgt: return ''
        data = s.z.read('word/' + tgt); mime = 'image/png' if tgt.endswith('png') else 'image/jpeg'
        src = f'data:{mime};base64,' + base64.b64encode(data).decode()
        if anc is None: return f'<img src="{src}" style="width:{wpx}px;height:{hpx}px">'
        ph = anc.find('wp:positionH', ns); pv = anc.find('wp:positionV', ns)
        hx = int(ph.find('wp:posOffset', ns).text) / 9525 if ph is not None and ph.find('wp:posOffset', ns) is not None else 0
        vy = int(pv.find('wp:posOffset', ns).text) / 9525 if pv is not None and pv.find('wp:posOffset', ns) is not None else 0
        return f'<img class="anch" data-hrel="{ph.get("relativeFrom") if ph is not None else ""}" data-vrel="{pv.get("relativeFrom") if pv is not None else ""}" src="{src}" style="width:{wpx:.1f}px;height:{hpx:.1f}px;--x:{hx:.1f}px;--y:{vy:.1f}px">'
    def p_html(s, p, incell=False):
        ppr = p.find('w:pPr', ns); st = {}; base = {}; prp = None
        sid = v(ppr, 'pStyle') if ppr is not None else None
        for sty in s.style_chain(sid or 'Normal'):
            pp = sty.find('w:pPr', ns); rp = sty.find('w:rPr', ns)
            if pp is not None: st = s.ppr_css(pp, st)
            if rp is not None: base = s.rpr_css(rp, base)
        if ppr is not None:
            st = s.ppr_css(ppr, st)
            # خط الفقرة (علامة الفقرة) يُستخدم لحجم الفقرة الفارغة
            prp = ppr.find('w:rPr', ns)
        inner = ''.join(s.run_html(r, base) for r in p.iter(q('r')))
        if not inner.strip():
            inner = '&nbsp;'
            if prp is not None: base = {k: x for k, x in s.rpr_css(prp, base).items() if k in ('font-size', 'font-family')}
        for m_ in re.finditer(r'class="anch"[^>]*width:([\d.]+)px;height:([\d.]+)px;--x:[\d.\-]+px;--y:([\d.\-]+)px', inner):
            st['min-height'] = f"{float(m_.group(2)) + float(m_.group(3)) + 6:.0f}px"
        stc = ';'.join(f'{k}:{x}' for k, x in st.items()); bc = ';'.join(f'{k}:{x}' for k, x in base.items() if k in ('font-size', 'font-family', 'font-weight'))
        return f'<p style="{stc};{bc}">{inner}</p>'
    def ppr_css(s, ppr, st):
        c = dict(st)
        jc = v(ppr, 'jc')
        if jc: c['text-align'] = {'center': 'center', 'right': 'right', 'left': 'left', 'both': 'justify', 'start': 'start', 'end': 'end'}.get(jc, jc)
        if ppr.find('w:bidi', ns) is not None: c['direction'] = 'rtl'
        sp = ppr.find('w:spacing', ns)
        if sp is not None:
            if sp.get(q('before')) is not None: c['margin-top'] = f"{px(sp.get(q('before')))}px"
            if sp.get(q('after')) is not None: c['margin-bottom'] = f"{px(sp.get(q('after')))}px"
            ln = sp.get(q('line')); rule = sp.get(q('lineRule'))
            if ln and rule in (None, 'auto'): c['line-height'] = f"{int(ln) / 240:.3f}"
            elif ln and rule in ('exact', 'atLeast'): c['line-height'] = f"{px(ln)}px"
        ind = ppr.find('w:ind', ns)
        if ind is not None:
            for a, k in (('start', 'margin-inline-start'), ('left', 'margin-left'), ('right', 'margin-right'), ('end', 'margin-inline-end'), ('hanging', None), ('firstLine', 'text-indent')):
                x = ind.get(q(a))
                if x and k: c[k] = f'{px(x)}px'
        return c
    # ---- جدول
    def border_css(s, b, side):
        if b is None: return ''
        val = b.get(q('val'))
        if val in (None, 'nil', 'none'): return f'border-{side}:none;'
        col = b.get(q('color')); col = '#000' if col in (None, 'auto') else '#' + col
        w = max(1, round(float(b.get(q('sz'), 4)) / 8 * 1.333, 2))
        sty = {'single': 'solid', 'dotted': 'dotted', 'dashed': 'dashed', 'double': 'double', 'thick': 'solid'}.get(val, 'solid')
        return f'border-{side}:{w}px {sty} {col};'
    def tbl_html(s, t):
        tp = t.find('w:tblPr', ns); sty = v(tp, 'tblStyle'); borders = {}
        for sx in s.style_chain(sty):
            tb = sx.find('w:tblPr/w:tblBorders', ns)
            if tb is not None:
                for ch in tb: borders[etree.QName(ch).localname] = ch
        tb = tp.find('w:tblBorders', ns)
        if tb is not None:
            for ch in tb: borders[etree.QName(ch).localname] = ch
        bidi = tp.find('w:bidiVisual', ns) is not None
        grid = [int(g.get(q('w'))) for g in t.find('w:tblGrid', ns)]
        tw = tp.find('w:tblW', ns); total = sum(grid)
        ind = tp.find('w:tblInd', ns); indpx = px(ind.get(q('w'))) if ind is not None else 0
        jc = v(tp, 'jc'); flo = tp.find('w:tblpPr', ns) is not None
        mar = tp.find('w:tblCellMar', ns); cm = {'top': 0, 'bottom': 0, 'left': 108, 'right': 108}
        for sx in s.style_chain(sty):
            m = sx.find('w:tblPr/w:tblCellMar', ns)
            if m is not None:
                for ch in m: cm[etree.QName(ch).localname] = int(ch.get(q('w')))
        if mar is not None:
            for ch in mar: cm[etree.QName(ch).localname] = int(ch.get(q('w')))
        rows = t.findall('w:tr', ns); n = len(grid)
        # بناء شبكة الدمج الرأسي
        spans = {}
        mat = []
        for ri, tr in enumerate(rows):
            col = 0; row = []
            gb = tr.find('w:trPr/w:gridBefore', ns); col += int(gb.get(q('val'))) if gb is not None else 0
            for tc in tr.findall('w:tc', ns):
                pr = tc.find('w:tcPr', ns); gs = int(v(pr, 'gridSpan') or 1) if pr is not None else 1
                vm = pr.find('w:vMerge', ns) if pr is not None else None
                row.append({'tc': tc, 'col': col, 'span': gs, 'vm': None if vm is None else (vm.get(q('val')) or 'cont'), 'rs': 1}); col += gs
            mat.append(row)
        for ri, row in enumerate(mat):
            for c in row:
                if c['vm'] == 'restart':
                    k = ri + 1
                    while k < len(mat):
                        m = next((x for x in mat[k] if x['col'] == c['col'] and x['vm'] == 'cont'), None)
                        if not m: break
                        m['skip'] = True; c['rs'] += 1; k += 1
        out = []
        for ri, (tr, row) in enumerate(zip(rows, mat)):
            trpr = tr.find('w:trPr', ns); h = v(trpr, 'trHeight') if trpr is not None else None
            hrule = trpr.find('w:trHeight', ns).get(q('hRule')) if trpr is not None and trpr.find('w:trHeight', ns) is not None else None
            cells = []
            for ci, c in enumerate(row):
                if c.get('skip'): continue
                tc = c['tc']; pr = tc.find('w:tcPr', ns); css = ''
                wd = sum(grid[c['col']:c['col'] + c['span']])
                css += f'width:{px(wd)}px;'
                sh = pr.find('w:shd', ns) if pr is not None else None
                if sh is not None and sh.get(q('fill')) not in (None, 'auto'): css += f"background:#{sh.get(q('fill'))};"
                va = v(pr, 'vAlign') if pr is not None else None
                css += f"vertical-align:{ {'center': 'middle', 'bottom': 'bottom'}.get(va, 'top') };"
                td = v(pr, 'textDirection') if pr is not None else None
                tcb = pr.find('w:tcBorders', ns) if pr is not None else None
                last_row = ri + c['rs'] - 1 == len(rows) - 1; first_row = ri == 0
                first_col = c['col'] == 0; last_col = c['col'] + c['span'] == n
                sides = {'top': 'top' if first_row else 'insideH', 'bottom': 'bottom' if last_row else 'insideH', 'left': 'left' if first_col else 'insideV', 'right': 'right' if last_col else 'insideV'}
                if bidi: sides['left'], sides['right'] = ('left' if last_col else 'insideV'), ('right' if first_col else 'insideV')
                for sd in ('top', 'left', 'bottom', 'right'):
                    b = None
                    if tcb is not None and tcb.find('w:' + sd, ns) is not None: b = tcb.find('w:' + sd, ns)
                    elif tcb is not None and sd == 'left' and tcb.find('w:start', ns) is not None: b = tcb.find('w:start', ns)
                    elif tcb is not None and sd == 'right' and tcb.find('w:end', ns) is not None: b = tcb.find('w:end', ns)
                    else: b = borders.get(sides[sd])
                    css += s.border_css(b, sd)
                pad = f"padding:{px(cm['top'])}px {px(cm['right'])}px {px(cm['bottom'])}px {px(cm['left'])}px;"
                css += pad
                if td in ('btLr', 'tbRl'): css += 'writing-mode:vertical-rl;transform:rotate(180deg);' if td == 'btLr' else 'writing-mode:vertical-rl;'
                ps = ''.join(s.p_html(p, True) for p in tc.findall('w:p', ns))
                ps += ''.join(s.tbl_html(tt) for tt in tc.findall('w:tbl', ns))
                nowrap = ''
                cells.append(f'<td data-c="{c["col"]}" colspan="{c["span"]}" rowspan="{c["rs"]}" style="{css}">{ps}</td>')
            hs = ''
            if h: hs = f' style="height:{px(h)}px"'
            empty = all(re.sub(r'<[^>]+>|&nbsp;', '', x).strip() == '' for x in cells) and not any(c.get('vm') for c in row)
            out.append((empty, f'<tr{hs}>' + ''.join(cells) + '</tr>'))
        keep = []
        for k, (emp, h) in enumerate(out):
            if emp and k > 0 and out[k - 1][0]: continue   # صفوف فارغة متتالية: نُبقي نموذجًا واحدًا
            if emp:
                n_ = 0
                while k + n_ < len(out) and out[k + n_][0]: n_ += 1
                keep.append(h.replace('<tr', f'<tr class="mr" data-n="{n_}"', 1))
            else: keep.append(h)
        out = keep
        ts = f'width:{px(total)}px;' 
        if ind is not None: ts += f'margin-inline-start:{indpx}px;'
        if flo or jc == 'center': ts += f'margin-left:calc((100% - {px(total)}px)/2);margin-right:calc((100% - {px(total)}px)/2);'
        return f'<table class="dt" data-bidi="{int(bidi)}" style="{ts}direction:{"rtl" if bidi else "ltr"}"><colgroup>' + ''.join(f'<col style="width:{px(g)}px">' for g in grid) + '</colgroup>' + ''.join(out) + '</table>'
    def part_html(s, root):
        out = ''
        for el in root:
            t = etree.QName(el).localname
            if t == 'p': out += s.p_html(el)
            elif t == 'tbl': out += s.tbl_html(el)
        return out
    def build(s):
        sp = s.doc.find('.//w:body/w:sectPr', ns); pg = sp.find('w:pgSz', ns); mg = sp.find('w:pgMar', ns)
        meta = {'w': px(pg.get(q('w'))), 'h': px(pg.get(q('h'))), 'top': px(mg.get(q('top'))), 'bottom': px(mg.get(q('bottom'))), 'left': px(mg.get(q('left'))), 'right': px(mg.get(q('right'))), 'header': px(mg.get(q('header'))), 'footer': px(mg.get(q('footer')))}
        s.cur = 'document'; body = s.doc.find('w:body', ns)
        s.cur = 'header1'; hdr = etree.fromstring(s.z.read('word/header1.xml')); h = s.part_html(hdr)
        s.cur = 'footer1'; ftr = etree.fromstring(s.z.read('word/footer1.xml')); f = s.part_html(ftr)
        s.cur = 'document'; b = s.part_html(body)
        return {'page': meta, 'header': h, 'footer': f, 'body': b}
def esc(x): return x.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]; res = {}
    for f in sorted(glob.glob(os.path.join(src, '*.docx'))):
        res[os.path.basename(f)[:-5]] = Doc(f).build()
    logos = {}
    for k, v_ in res.items():
        for part in ('header', 'footer', 'body'):
            def rep(m):
                logos.setdefault(m.group(1)[:80], m.group(1)); return 'src="{{LOGO:%s}}"' % list(logos).index(m.group(1)[:80])
            v_[part] = re.sub(r'src="(data:[^"]+)"', rep, v_[part])
    res = {'logos': list(logos.values()), 'kinds': res}
    json.dump(res, open(out, 'w', encoding='utf8'), ensure_ascii=False)
    print('ok', len(open(out, encoding='utf8').read()), len(res['logos']))
