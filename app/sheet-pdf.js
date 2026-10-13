// تصدير كشف الحضور إلى PDF طبق الأصل عن النموذج الورقي (Word): نفس الهيدر/الفوتر/الشعار/الخطوط/الألوان/الجداول.
// القوالب مولَّدة من ملفات Word بالأداة tools/docx2tpl.py (app/forms/tpl.json). التعبئة بمطابقة عناوين الخلايا.
import TPL from './forms/tpl.json';
import { KINDS, derivedCounts, peopleOf, heldMeetings, SG } from '../core/sheets.js';

const FILE = { course: '1e5fc21a', edu: '2c872279', parents: '00ce7a59', activity: 'b220f1c9', openday: '59c81c53', trip: '32496b52', visit: 'c5fa9ef2', joint: 'fc34e43e', interview: 'b220f1c9' };
const NP = (s) => String(s || '').replace(/[\s‌‎‏ :：.…_ً-ٟ]+/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); // يُبقي الأقواس
const N = (s) => NP(s).replace(/[()]/g, '');
const dmy = (d) => (d ? d.split('-').reverse().join('/') : '');
// ---------- إعدادات الطباعة (عامة + لكل نوع كشف) ----------
export const PRINT_DEF = {
  font: '', fontScale: 100, tableScale: 100, orient: 'auto', mL: null, mR: null, minRows: 0, rowH: 0, logoScale: 100, stampText: 'مستند مراقب',
  align: { basic: 'right', name: 'right', cols: 'center', v: 'middle' },
  marks: { present: '✓', absent: 'غـ', sexM: '/', sexF: '/', select: '✓' },
  cols: {}, extra: [],
  show: { logo: true, header: true, footer: true, sign: true, stamp: true, project: true, title: true, idx: true },
};
let PCFG = {}, C = PRINT_DEF, MARK = '✓';
export const setPrintCfg = (o) => { PCFG = o && typeof o === 'object' ? o : {}; };
export const printStore = () => PCFG;
const mergeC = (...a) => { const r = JSON.parse(JSON.stringify(PRINT_DEF)); for (const x of a) for (const k in (x || {})) { if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) Object.assign(r[k] ||= {}, x[k]); else if (x[k] !== undefined && x[k] !== null) r[k] = x[k]; } return r; };
export const cfgOf = (kind, draft) => mergeC(PCFG._, PCFG[kind], draft);

// ---------- أدوات DOM ----------
const tds = (root) => [...root.querySelectorAll('td')];
const txt = (td) => td.textContent;
function setText(td, text) {
  const p = td.querySelector('p') || td.appendChild(td.ownerDocument.createElement('p')), sp = [...p.querySelectorAll('span')].find((s) => s.textContent.trim()) || p.querySelector('span');
  if (sp) { [...p.querySelectorAll('span')].forEach((s) => s !== sp && s.remove()); sp.textContent = text; if (/#?f{6}|white/i.test(sp.style.color || sp.getAttribute('style') || '') && /color:\s*#f{6}/i.test(sp.getAttribute('style') || '')) sp.style.color = '#000'; } else p.textContent = text;
  [...td.querySelectorAll('p')].slice(1).forEach((x) => x.remove());
}
// نص بعد النص الأصلي داخل نفس الخلية (مثل «عدد الساعات التدريبية: 12»)
function appendText(td, text) { const p = td.querySelector('p'), sp = [...p.querySelectorAll('span')].pop() || p; sp.textContent = sp.textContent.replace(/[\s:]*$/, '') + ': ' + text; }
function alignCell(td) { td.style.verticalAlign = C.align.v; td.querySelectorAll('p').forEach((p) => { p.style.textAlign = C.align.basic; }); }
// أول خلية عنوانها يطابق label؛ تعود بالخلية
function labelCell(root, label, from = 0) { const L = N(label); return tds(root).slice(from).find((td) => { const t = N(txt(td)); return t === L || (t.startsWith(L) && t.length - L.length <= 6); }); }
function after(root, label, value, o = {}) {
  if (value == null || value === '') return;
  const l = labelCell(root, label); if (!l) return;
  if (o.inline) return appendText(l, value);
  let n = l.nextElementSibling; if (n) { setText(n, String(value)); alignCell(n, 'right'); }
}
// استبدال أول «(   )» في نص الخلية التي تحتوي pattern
function fillParen(root, re, value, scope) {
  for (const td of tds(scope || root)) {
    const t = txt(td); if (!re.test(NP(t))) continue;
    for (const sp of td.querySelectorAll('span')) { if (/\(\s*\)/.test(sp.textContent)) { sp.textContent = sp.textContent.replace(/\(\s*\)/, `( ${value} )`); return td; } }
    // قد تتوزع الأقواس على أكثر من span
    const p = td.querySelector('p'); if (p && /\(\s*\)/.test(p.textContent)) { const full = p.textContent.replace(/\(\s*\)/, `( ${value} )`); const sp = p.querySelector('span'); if (sp) { [...p.querySelectorAll('span')].slice(1).forEach((x) => x.remove()); sp.textContent = full; } return td; }
  }
}
// الأوقات «من الساعة: / حتى الساعة:»
function fillTimes(root, from, to) {
  const w = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    let t = n.nodeValue;
    if (from && /من\s*الساعة/.test(t) && !n._f) { t = t.replace(/(من\s*الساعة\s*:?)/, `$1 ${from} `); n._f = 1; }
    if (to && /حتى\s*الساعة/.test(t) && !n._t) { t = t.replace(/(حتى\s*الساعة\s*:?)/, `$1 ${to} `); n._t = 1; }
    n.nodeValue = t;
  }
}
// الآلية: وجاهي/إلكتروني
function fillMode(root, m, centerName) {
  for (const td of tds(root)) {
    const t = N(txt(td)); const isIn = /وجاهي/.test(t), isOn = /الكتروني/.test(t); if (!isIn && !isOn) continue;
    if (!(td.querySelector('p'))) continue; const sel = isIn ? m.mode !== 'online' : m.mode === 'online';
    const p = td.querySelector('p'); let full = p.textContent;
    if (sel) full = full.replace(/\(\s*\)/, `( ${MARK} )`);
    if (sel) full = full.replace(/\.{4,}/, (isIn ? centerName : m.venue) || '................');
    const sp = p.querySelector('span'); if (sp) { [...p.querySelectorAll('span')].slice(1).forEach((x) => x.remove()); sp.textContent = full; }
  }
}
const GROUPS = [['اطفال(4-6)', 'c46'], ['اطفال(7-12)', 'c712'], ['يافعين/ات(13-15)', 'y1315'], ['يافعين/ات(16-18)', 'y1618'], ['شباب', 'adult'], ['اهالي', 'parents'], ['تربويين/اتالنوي', 'edN'], ['تربويين/اتخريجين', 'edG'], ['تربويين/اتالمدارس', 'edS'], ['تربويين/ات', 'ed']];
function fillGroups(root, groups) {
  const has = (k) => (k === 'ed' ? ['edN', 'edG', 'edS'].some((x) => groups.includes(x)) : groups.includes(k));
  const norm = (s) => String(s).replace(/[\s‌‎‏ ]+/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\(\)/g, '');
  for (const td of tds(root)) {
    if (td.querySelector('table')) continue; const p = td.querySelector('p'); if (!p || !/\(\s*\)/.test(p.textContent)) continue;
    const t = norm(p.textContent.replace(/\(\s*\)/, '')); const hit = GROUPS.find(([k]) => t.includes(norm(k))); if (!hit) continue;
    // لا نخلط «أهالي» ضمن «تدريبات أهالي»
    if (has(hit[1])) fillParenIn(td, MARK);
  }
}
function fillParenIn(td, v) { const p = td.querySelector('p'); const full = p.textContent.replace(/\(\s*\)/, `( ${v} )`); const sp = p.querySelector('span'); if (sp) { [...p.querySelectorAll('span')].slice(1).forEach((x) => x.remove()); sp.textContent = full; } }

// ---------- جدول المشاركين ----------
function leafLabels(table) { // عنوان كل عمود من صفوف الرأس
  const rows = [...table.querySelectorAll('tr')].filter((r) => !r.classList.contains('mr')), lab = {};
  for (const r of rows) for (const td of r.children) { const c = +td.dataset.c, span = td.colSpan || 1, t = N(txt(td)); if (span === 1 || !lab[c]) { if (span === 1) lab[c] = t || lab[c]; } }
  for (const r of rows) for (const td of r.children) { const c = +td.dataset.c, span = td.colSpan || 1, t = N(txt(td)); if (span > 1) for (let k = c; k < c + span; k++) lab[k] ||= t; }
  return lab;
}
const colRole = (l) => (/^\d+$/.test(l.replace(/[()]/g, '')) ? 'mt:' + l.replace(/[()]/g, '') : /^(م|#)$/.test(l) ? 'idx' : /^(ذكر)$/.test(l) ? 'sexM' : /^(انثي|انثي)$/.test(l) ? 'sexF' : /الجنس/.test(l) ? 'sex' : /العمر/.test(l) ? 'age' : /اعاقه/.test(l) ? 'dis' : /(هاتف|الجوال|التواصل)/.test(l) ? 'phone' : /التوقيع/.test(l) ? 'sig' : /(اسم|الاسم)/.test(l) ? 'name' : /اللقاءات/.test(l) ? 'meetgrp' : '');
function fillRoster(table, people, sh, joint) {
  const model = table.querySelector('tr.mr'); if (!model) return;
  const lab = leafLabels(table), roles = {}; const cols = [...model.children].map((td) => +td.dataset.c); for (const c of cols) roles[c] = colRole(lab[c] || '');
  if (joint) { const ch = joint.child; for (const c of cols) { if (c >= 5) roles[c] = ({ 5: 'name', 6: 'sex', 7: 'age', 8: 'dis', 9: 'sig' })[c]; else roles[c] = ({ 0: 'idx', 1: 'name', 2: 'sex', 3: 'phone', 4: 'sig' })[c]; } }
  const CC = C.cols || {}, held = heldMeetings(sh), nTpl = +model.dataset.n || 10, total = Math.max(C.minRows || 0, joint ? Math.max(joint.parents.length, joint.kids.length) : (people || []).length);
  const rowsData = joint ? Array.from({ length: Math.max(joint.parents.length, joint.kids.length) }, (_, i) => ({ P: joint.parents[i], K: joint.kids[i] })) : (people || []);
  const tb = document.implementation.createHTMLDocument('').body, out = [];
  // الرأس داخل thead ليتكرر في كل صفحة
  const heads = [...table.querySelectorAll('tr')].filter((r) => r !== model && !r.classList.contains('mr'));
  for (let i = 0; i < total; i++) {
    const tr = model.cloneNode(true); tr.classList.remove('mr'); tr.removeAttribute('data-n'); const d = rowsData[i];
    for (const td of tr.children) {
      const c = +td.dataset.c, role = roles[c] || ''; let v = '';
      const pp = joint ? (c >= 5 ? d?.K : d?.P) : d;
      if (role === 'idx' && C.show.idx) v = String(i + 1);
      if (pp) {
        if (role === 'name') v = pp.missing ? '(محذوف)' : pp.name;
        else if (role === 'sex') v = pp.sex === 'M' ? 'ذكر' : pp.sex === 'F' ? 'أنثى' : '';
        else if (role === 'sexM') v = pp.sex === 'M' ? C.marks.sexM : '';
        else if (role === 'sexF') v = pp.sex === 'F' ? C.marks.sexF : '';
        else if (role === 'age') v = pp.age ?? '';
        else if (role === 'dis') v = pp.disability ? (pp.dtype || '') + (pp.dtypeOther ? ': ' + pp.dtypeOther : '') : '';
        else if (role === 'phone') v = pp.phone || '';
        else if (role.startsWith('mt:')) { const m = held[+role.slice(3) - 1]; v = m ? (m.present.includes(pp.id) ? C.marks.present : C.marks.absent) : ''; }
      }
      const oc = CC[c] || {}; if ((v === '' || v == null) && oc.fill) v = oc.fill;
      setText(td, String(v)); if (role === 'idx') td.querySelector('p').style.whiteSpace = 'nowrap';
      td.querySelector('p').style.textAlign = role === 'name' ? C.align.name : C.align.cols; td.style.verticalAlign = C.align.v; if (C.rowH) td.style.height = C.rowH + 'px';
      { const q = td.querySelector('p'); if (oc.h) q.style.textAlign = oc.h; if (oc.v) td.style.verticalAlign = oc.v; if (oc.dir === 'ltr') q.style.direction = 'ltr'; if (oc.dir === 'vert') { td.style.writingMode = 'vertical-rl'; td.style.textOrientation = 'mixed'; } if (oc.pad !== undefined && oc.pad !== '') td.style.padding = oc.pad + 'px'; }
    }
    out.push(tr);
  }
  const thead = table.ownerDocument.createElement('thead'); heads.forEach((h) => thead.appendChild(h)); const tbody = table.ownerDocument.createElement('tbody'); out.forEach((r) => tbody.appendChild(r));
  table.classList.add('rost'); model.remove(); table.appendChild(thead); table.appendChild(tbody); applyCols(table, CC, C.extra || []);
}

// تحكم بأعمدة الجدول: حذف/إخفاء، عناوين، عروض، اتجاه النص، وأعمدة إضافية فارغة أو بنص ثابت
function applyCols(table, CC, extra) {
  const d = table.ownerDocument, colg = table.querySelector('colgroup'), cols = colg ? [...colg.children] : [], orig = cols.map((c) => parseFloat(c.style.width) || 40), total = orig.reduce((a, b) => a + b, 0);
  const hid = new Set(Object.entries(CC).filter(([, v]) => v.hide).map(([k]) => +k)), rows = [...table.querySelectorAll('tr')], hrows = [...table.querySelectorAll('thead tr')];
  if (!hid.size && !extra.length && !Object.values(CC).some((v) => v.w || v.title || v.dir)) return;
  for (const tr of hrows) for (const td of tr.children) { const c = +td.dataset.c, o = CC[c]; if (!o || (td.colSpan || 1) > 1) continue; if (o.title) setText(td, o.title); if (o.dir === 'vert') { td.style.writingMode = 'vertical-rl'; td.style.textOrientation = 'mixed'; } }
  for (const tr of rows) for (const td of [...tr.children]) { const c = +td.dataset.c, n = td.colSpan || 1; let k = 0; for (let i = c; i < c + n; i++) if (hid.has(i)) k++; if (k === n) td.remove(); else if (k) td.colSpan = n - k; }
  const keep = orig.map((_, i) => i).filter((i) => !hid.has(i));
  const exS = extra.filter((e) => e.pos === 'start'), exE = extra.filter((e) => e.pos !== 'start');
  const items = [...exS.map((e) => ({ e, w: +e.w || 60, fx: true })), ...keep.map((i) => ({ i, w: CC[i]?.w ? +CC[i].w : orig[i], fx: !!CC[i]?.w })), ...exE.map((e) => ({ e, w: +e.w || 60, fx: true }))];
  const fixed = items.filter((x) => x.fx).reduce((a, x) => a + x.w, 0), free = items.filter((x) => !x.fx).reduce((a, x) => a + x.w, 0), f = free > 0 ? Math.max(0.3, (total - fixed) / free) : 1;
  items.forEach((x) => { x.w = x.fx ? x.w : x.w * f; });
  const firstH = hrows[0]?.querySelector('td'), body = [...table.querySelectorAll('tbody tr')], proto = body[0]?.querySelector('td');
  const mkCell = (src, text, e, head) => { const td = src.cloneNode(true); td.removeAttribute('data-c'); td.colSpan = 1; td.rowSpan = head ? hrows.length || 1 : 1; td.style.width = ''; td.style.writingMode = ''; setText(td, text); const p = td.querySelector('p'); if (p && !head) p.style.textAlign = e.h || 'center'; return td; };
  const put = (list, atStart) => list.forEach((e) => {
    if (firstH && hrows[0]) { const t = mkCell(firstH, e.title || '', e, true); atStart ? hrows[0].prepend(t) : hrows[0].append(t); }
    if (proto) body.forEach((tr) => { const t = mkCell(proto, e.fill || '', e, false); atStart ? tr.prepend(t) : tr.append(t); });
  });
  put([...exS].reverse(), true); put(exE, false);
  if (colg) { colg.innerHTML = ''; items.forEach((x) => { const col = d.createElement('col'); col.style.width = x.w.toFixed(1) + 'px'; colg.append(col); }); }
  rows.forEach((tr) => [...tr.children].forEach((td) => { td.style.width = ''; }));
}
// قائمة أعمدة جدول المشاركين في قالب نوع كشف (لشاشة الإعدادات)
export function rosterColumns(kind) {
  const T = TPL.kinds[FILE[kind]]; if (!T) return []; const dom = new DOMParser().parseFromString(`<div>${T.body}</div>`, 'text/html'), tb = [...dom.querySelectorAll('table.dt')].filter((t) => t.querySelector('tr.mr')).pop(); if (!tb) return [];
  const rr = [...tb.querySelectorAll('tr')].filter((r) => !r.classList.contains('mr')), model = tb.querySelector('tr.mr'), out = [];
  for (const m of model.children) { const c = +m.dataset.c; let leaf = '', grp = ''; for (const r of rr) for (const td of r.children) { const a = +td.dataset.c, n = td.colSpan || 1, t = td.textContent.replace(/\s+/g, ' ').trim(); if (c >= a && c < a + n && t) { if (n === 1) leaf = t; else grp ||= t; } } out.push({ c, label: (grp && leaf ? grp + ' — ' : '') + (leaf || grp || '#' + c) }); }
  return out;
}

// ---------- الأعداد ----------
const emp = () => ({ total: 0, M: 0, F: 0, MWD: 0, FWD: 0, types: {}, other: new Set() });
function countsOf(people) {
  const c = emp(); for (const p of people) { if (p.missing) continue; c.total++; if (p.sex === 'M') { c.M++; if (p.disability) c.MWD++; } else if (p.sex === 'F') { c.F++; if (p.disability) c.FWD++; } if (p.disability) { const t = p.dtype || 'أخرى'; c.types[t] = (c.types[t] || 0) + 1; if (t === 'أخرى' && p.dtypeOther) c.other.add(p.dtypeOther); } }
  return c;
}
function fillCounts(scope, c) {
  const R = [[/([اإ]جمالي)\s*\(\s*\)/, c.total], [/(ذكور\s*ذوي\s*[اإ]عاقة)\s*\(\s*\)/, c.MWD], [/([اإ]ناث\s*ذوي\s*[اإ]عاقة)\s*\(\s*\)/, c.FWD], [/(ذكور)\s*\(\s*\)/, c.M], [/(اناث|إناث)\s*\(\s*\)/, c.F]];
  for (const p of scope.querySelectorAll('p')) {
    let t = p.textContent; if (!/\(\s*\)/.test(t)) continue; let ch = false;
    for (const [re, v] of R) if (re.test(t)) { t = t.replace(re, `$1 ( ${v} )`); ch = true; }
    if (!ch) continue; const sp = [...p.querySelectorAll('span')].find((x) => x.textContent.trim()) || p.querySelector('span'); if (!sp) { p.textContent = t; continue; }
    [...p.querySelectorAll('span')].forEach((x) => x !== sp && x.remove()); sp.textContent = t;
  }
}
function fillDis(root, c) {
  for (const [lab, key] of [['سمعيه', 'سمعية'], ['بصريه', 'بصرية'], ['حركيه', 'حركية'], ['ذهنيه', 'ذهنية']]) fillParen(root, new RegExp('^' + lab + '\\('), c.types[key] || 0);
  const td = tds(root).find((t) => /^اخري/.test(N(txt(t)))); if (td) {
    const p = td.querySelector('p'); let full = p.textContent; const n = c.types['أخرى'] || 0, o = [...c.other].join('، ');
    full = /\(\s*\)/.test(full) ? full.replace(/\(\s*\)/, `( ${n} )`) : full; if (o) full = full.replace(/\.{4,}/, o);
    const sp = p.querySelector('span'); if (sp) { [...p.querySelectorAll('span')].slice(1).forEach((x) => x.remove()); sp.textContent = full; }
  }
}

// الهيدر كما في Word: الجدول والشعار بجانبه (يمينه) بمحاذاة أعلاه على يسار الورقة، و«مستند مراقب» تحت الجدول
function fixHeader(H) {
  const tbl = H.querySelector('table'), img = H.querySelector('img.anch'); if (!tbl) return; const d = H.ownerDocument;
  const w = parseFloat(img?.style.width || 98) * C.logoScale / 100, h = parseFloat(img?.style.height || 98) * C.logoScale / 100;
  const wrap = d.createElement('div'); wrap.style.cssText = 'display:flex;direction:ltr;align-items:flex-start;justify-content:flex-start;gap:14px';
  const left = d.createElement('div'); tbl.style.margin = '0'; tbl.style.position = 'static'; left.append(tbl);
  if (C.show.stamp && C.stampText) { const st = d.createElement('p'); st.textContent = C.stampText; st.style.cssText = "direction:rtl;text-align:left;margin:8px 0 0 0;font:700 10.5pt Tahoma,'Simplified Arabic',sans-serif;color:#7f7f7f"; left.append(st); }
  wrap.append(left);
  if (img && C.show.logo) { img.removeAttribute('class'); img.style.cssText = `width:${w}px;height:${h}px;flex:none`; wrap.append(img); }
  H.innerHTML = ''; H.append(wrap);
}
// التواقيع: المنشط/ة على اليمين والمنسق/ة على اليسار
function fixFooter(F) {
  const d = F.ownerDocument, p = [...F.querySelectorAll('p')].find((x) => /المنسق/.test(x.textContent)); if (!p) return;
  if (!C.show.sign) { F.innerHTML = ''; return; }
  const full = p.textContent.replace(/\s+/g, ' ').trim(), i = full.indexOf('توقيع المنسق'), a = i > 0 ? full.slice(0, i).trim() : full, b = i > 0 ? full.slice(i).trim() : '';
  const sty = p.querySelector('span')?.getAttribute('style') || '', row = d.createElement('div'); row.style.cssText = 'display:flex;justify-content:space-between;direction:rtl;width:100%';
  for (const t of [a, b]) { const sp = d.createElement('span'); sp.setAttribute('style', sty); sp.textContent = t; row.append(sp); }
  F.innerHTML = ''; F.append(row);
}
// تكبير/تصغير الخطوط المضمّنة (pt)
function scaleFonts(root, k) { if (k === 100) return; root.querySelectorAll('[style*="font-size"]').forEach((e) => { e.style.fontSize = e.style.fontSize.replace(/([\d.]+)pt/, (_, n) => (+n * k / 100).toFixed(1) + 'pt'); }); }

// ---------- التعبئة الكاملة ----------
export function buildSheetDoc(sh, db, o = {}) {
  C = cfgOf(sh.kind, o.cfg); MARK = C.marks.select;
  const K = KINDS[sh.kind], T = TPL.kinds[FILE[sh.kind]], m = sh.meta || {}, proj = db.projects.find((p) => p.id === sh.projectId), center = db.centers.find((c) => c.id === sh.centerId)?.name || '';
  const logo = TPL.logos[0], fix = (h) => h.replace(/src="\{\{LOGO:\d+\}\}"/g, `src="${logo}"`);
  const dom = new DOMParser().parseFromString(`<div id="h">${fix(T.header)}</div><div id="b">${fix(T.body)}</div><div id="f">${fix(T.footer)}</div>`, 'text/html'), B = dom.getElementById('b');
  const people = peopleOf(sh, db), counts = countsOf(people);
  // اسم المشروع
  const pn = [...B.querySelectorAll('p')].find((p) => N(p.textContent).startsWith('اسمالمشروع')); if (pn) { const sp = [...pn.querySelectorAll('span')].find((s) => s.textContent.trim()); if (sp) { [...pn.querySelectorAll('span')].forEach((s) => s !== sp && s.remove()); sp.textContent = 'اسم المشروع: ' + (proj?.name || ''); pn.style.margin = '0'; pn.style.maxWidth = 'none'; pn.style.width = 'auto'; pn.style.paddingInline = '0'; } }
  const lines = (a) => (a || []).map((x, i) => `${i + 1}. ${x}`).join('\n');
  const setLines = (label, arr) => { const l = labelCell(B, label), n = l?.nextElementSibling; if (n && arr?.length) { const p = n.querySelector('p'), st = p.getAttribute('style') || ''; const sp = p.querySelector('span'); const sty = sp?.getAttribute('style') || ''; n.innerHTML = arr.map((x, i) => `<p style="${st};text-align:${C.align.basic}"><span style="${sty}">${i + 1}. ${x.replace(/</g, '&lt;')}</span></p>`).join(''); n.style.verticalAlign = 'middle'; } };
  // سطرا اسم المشروع وعنوان الكشف: أسود بلا تظليل وبينهما تباعد، وبلا نقاط في آخر العنوان
  { let k = 0; for (const el of [...B.children]) { if (el.tagName === 'TABLE') break; if (el.tagName !== 'P') continue; el.querySelectorAll('span').forEach((x) => { x.style.background = 'none'; x.style.color = '#000'; });
      const sps = [...el.querySelectorAll('span')].reverse(); for (const x of sps) { const t = x.textContent; if (!t.trim()) continue; x.textContent = t.replace(/[.…\s]+$/, ''); if (x.textContent.trim()) break; }
      el.style.marginBottom = '10px'; el.style.marginTop = k ? '4px' : '0'; if ((k === 0 && !C.show.project) || (k === 1 && !C.show.title)) el.remove(); k++; } }
  fixHeader(dom.getElementById('h')); fixFooter(dom.getElementById('f'));
  const kind = sh.kind;
  if (kind === 'course') {
    after(B, 'عنوان الدورة', m.title); after(B, 'تاريخ بدء الدورة', dmy(m.start)); after(B, 'تاريخ انتهاء الدورة', dmy(m.end)); after(B, 'اسم المنشط/ة- المدرب/ة', m.facilitator);
    after(B, 'نوع الدورة', [m.type, m.hours !== '' && m.hours != null ? `عدد الساعات التدريبية: ${m.hours}` : ''].filter(Boolean).join(' — '));
    after(B, 'اجمالي عدد لقاءات الدورة', m.meetings); after(B, 'المطوية', m.booklet); after(B, 'نسبة الحضور الإلزامية', m.mandatoryPct !== '' && m.mandatoryPct != null ? m.mandatoryPct + '%' : '');
    const ms = labelCell(B, 'مكان تنفيذ الدورة'); if (ms) { const n = ms.nextElementSibling; if (n && m.mode !== 'online') { setText(n, m.venue || ''); alignCell(n, 'right'); }; }
  } else if (kind === 'edu') {
    after(B, 'موضوع التدريب', m.title); after(B, 'نوع التدريب', m.type); after(B, 'اجمالي ساعات التدريب', m.hours); after(B, 'اجمالي عدد اللقاءات', m.meetings); after(B, 'نسبة الحضور الإلزامية', m.mandatoryPct !== '' && m.mandatoryPct != null ? m.mandatoryPct + '%' : '');
    const ms = labelCell(B, 'مكان تنفيذ التدريب'); if (ms && m.mode !== 'online') { const n = ms.nextElementSibling; if (n) { setText(n, m.venue || ''); alignCell(n, 'right'); }; }
  } else if (kind === 'parents') {
    after(B, 'اسم الدورة التدريبية', m.title); after(B, 'اسم المدرب/ة', m.facilitator); after(B, 'تاريخ بدء الدورة التدريبية', dmy(m.start)); after(B, 'تاريخ انتهاء الدورة التدريبية', dmy(m.end)); after(B, 'نوع الدورة التدريبية', m.type); after(B, 'اجمالي عدد الجلسات', m.meetings); after(B, 'المطوية', m.booklet);
    const ms = labelCell(B, 'مكان تنفيذ التدريب'); if (ms && m.mode !== 'online') { const n = ms.nextElementSibling; if (n) { setText(n, m.venue || ''); alignCell(n, 'right'); }; }
  } else if (kind === 'activity' || kind === 'interview') {
    after(B, 'اسم النشاط', m.title); after(B, 'نوع النشاط', m.type); after(B, 'اسم المنشط/ة', m.facilitator); after(B, 'تاريخ تنفيذ النشاط', dmy(m.date)); after(B, 'المطوية', m.booklet);
    const ms = labelCell(B, 'مكان تنفيذ النشاط'); if (ms && m.mode !== 'online') { const n = ms.nextElementSibling; if (n) { setText(n, kind === 'interview' ? m.place || '' : m.venue || ''); alignCell(n, 'right'); }; }
  } else if (kind === 'openday') {
    setLines('أسماء الأنشطة', m.activities); setLines('أسماء المنشطين/ات', m.facilitators); after(B, 'نوع النشاط', m.type); after(B, 'المطوية', m.booklet); after(B, 'المركز', center); after(B, 'مكان تنفيذ النشاط', m.venue); after(B, 'تاريخ التنفيذ', dmy(m.date));
  } else if (kind === 'trip') {
    after(B, 'نوع الرحلة', m.type); after(B, 'تاريخ تنفيذ الرحلة', dmy(m.date)); after(B, 'المسؤول عن الرحلة', m.facilitator); after(B, 'المركز المنفذ للرحلة', center); after(B, 'مكان تنفيذ الرحلة', m.place); after(B, 'المطوية', m.booklet);
  } else if (kind === 'visit') {
    setLines('أسماء الأنشطة', m.activities); setLines('أسماء المنشطين', m.facilitators); after(B, 'تاريخ الزيارة', dmy(m.date)); after(B, 'نوع الزيارة', m.type); after(B, 'المطوية', m.booklet); after(B, 'المركز المستضيف للجهة الزائرة', center);
    after(B, 'مكان استضافة الجهة الزائرة', m.venue); after(B, 'اسم الجهة الزائرة', m.body); after(B, 'شخص التواصل', m.contact); after(B, 'رقم التواصل', m.contactPhone); setLines('أسماء المرافقين', m.companions);
  } else if (kind === 'joint') {
    after(B, 'اسم النشاط', m.title); after(B, 'اسم المنشط /ة', m.facilitator); after(B, 'نوع النشاط', m.type); after(B, 'تاريخ النشاط', dmy(m.date)); after(B, 'المطوية', m.booklet);
    const ms = labelCell(B, 'مكان تنفيذ النشاط'); if (ms && m.mode !== 'online') { const n = ms.nextElementSibling; if (n) { setText(n, m.venue || ''); alignCell(n, 'right'); }; }
  }
  fillTimes(B, m.from, m.to); fillMode(B, m, center); fillGroups(B, m.groups || []);
  // الأعداد ونوع الإعاقة
  const tbls = [...B.querySelectorAll('table.dt')];
  if (kind === 'joint') {
    const kids = people.filter((p) => p.list === 'roster'), par = people.filter((p) => p.list === 'rosterP'), t1 = tbls[0], t2 = tbls[1];
    fillCounts(t1, countsOf(kids)); fillCounts(t2, countsOf(par)); fillDis(t2, countsOf(people));
    fillRoster(tbls[2], null, sh, { parents: par, kids });
  } else {
    fillCounts(B, K.multi ? (() => { const d = derivedCounts(sh, db); return { total: d.total, M: d.M, F: d.F, MWD: d.MWD, FWD: d.FWD }; })() : counts); fillDis(B, K.multi ? (() => { const att = new Set(heldMeetings(sh).flatMap((x) => x.present)); return countsOf(people.filter((p) => p.guest || att.has(p.id))); })() : counts);
    const rt = tbls[tbls.length - 1]; fillRoster(rt, people, sh);
  }
  [dom.getElementById('h'), B, dom.getElementById('f')].forEach((r) => scaleFonts(r, C.fontScale));
  return { dom, T, doc: dom, C };
}

const CSS = (p, c) => `@page{size:${p.w}px ${p.h}px;margin:0}*{box-sizing:border-box}
html,body{margin:0;padding:0}body{font-family:${c.font ? `'${c.font}',` : ''}'Simplified Arabic','Traditional Arabic','Noto Naskh Arabic',serif;font-size:11pt;direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${c.font ? `body *{font-family:'${c.font}','Simplified Arabic',serif!important}` : ''}
p{margin:0}.dt{border-collapse:collapse;table-layout:fixed}.dt td{overflow:hidden;overflow-wrap:anywhere}.dt tr{break-inside:avoid}
.rost{zoom:${c.tableScale / 100}}
.pgw{width:100%;border-collapse:collapse}.pgw>thead>tr>td,.pgw>tbody>tr>td,.pgw>tfoot>tr>td{padding:0;vertical-align:top}
.hd{padding:${p.header}px ${p.right}px 0 ${p.left}px}.bd{padding:6px ${p.right}px 0 ${p.left}px}.ft{padding:0 ${p.right}px ${p.footer}px ${p.left}px}.tab{display:inline-block;width:42px}
.fx{position:fixed;left:0;right:0;background:#fff;z-index:2}.fxh{top:0}.fxf{bottom:0}
@media screen{html{background:#d9d9d9}body{width:${p.w}px;min-height:${p.h}px;margin:14px auto;background:#fff;box-shadow:0 0 8px #0005}.fx{position:static}.hs,.fs{display:none}body{display:flex;flex-direction:column}.fxh{order:1}.pgw{order:2}.fxf{order:3;margin-top:auto}}`;

export function sheetHTML(sh, db, title, o = {}) {
  const { dom, T, C: cc } = buildSheetDoc(sh, db, o), p = { ...T.page }, g = (id) => dom.getElementById(id).innerHTML;
  if (cc.orient === 'landscape' && p.w < p.h) [p.w, p.h] = [p.h, p.w]; else if (cc.orient === 'portrait' && p.w > p.h) [p.w, p.h] = [p.h, p.w];
  if (cc.mL != null) p.left = Math.round(cc.mL * 3.7795); if (cc.mR != null) p.right = Math.round(cc.mR * 3.7795);
  const hdr = cc.show.header ? g('h') : '', ftr = cc.show.footer ? g('f') : '';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${(title || '').replace(/</g, '&lt;')}</title><style>${CSS(p, cc)}</style></head><body>
<div class="fx fxh"><div class="hd">${hdr}</div></div><div class="fx fxf"><div class="ft">${ftr}</div></div>
<table class="pgw"><thead><tr><td><div class="hs"></div></td></tr></thead><tbody><tr><td><div class="bd">${g('b')}</div></td></tr></tbody><tfoot><tr><td><div class="fs"></div></td></tr></tfoot></table>
<script>(function(){var h=document.querySelector('.fxh'),f=document.querySelector('.fxf'),a=document.querySelector('.hs'),b=document.querySelector('.fs');function s(){a.style.height=h.offsetHeight+'px';b.style.height=f.offsetHeight+'px'}s();addEventListener('load',s);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(s)})()</script></body></html>`;
}
export const sheetFileName = (sh, db) => { const K = KINDS[sh.kind], m = sh.meta || {}; const t = m.title || (m.activities || [])[0] || m.type || K.name; return `كشف حضور - ${K.name} - ${t} - ${m.date || m.start || ''}`.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim(); };

// طباعة/حفظ كـ PDF عبر نافذة الطباعة: متجه (نصّ حقيقي) وبخطوط الجهاز نفسها (Simplified Arabic/Tahoma)
export function printSheet(sh, db) {
  const name = sheetFileName(sh, db), html = sheetHTML(sh, db, name);
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.append(f);
  const d = f.contentDocument; d.open(); d.write(html); d.close();
  const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } };
  if (d.fonts?.ready) d.fonts.ready.then(() => setTimeout(go, 250)); else setTimeout(go, 400);
}
