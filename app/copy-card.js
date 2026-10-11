// نسخ أي بطاقة في البرنامج: كصورة (PNG) أو كملخص نصي (جداول بصيغة TSV تُلصق مباشرة في Excel)
import { toBlob } from 'html-to-image';
import { tr, getLang } from './i18n.js';
let tools, cur, T = (m) => m;
const TAB = '\u0001';  // فاصل أعمدة محمي من تنظيف المسافات
const clean = (s) => s.replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const chartOf = (cv) => window.__nawa?.charts?.().find((c) => c.canvas === cv);
function chartText(c) {
  const labels = c.data.labels || [], ds = c.data.datasets || [];
  if (c.config.type === 'doughnut' || c.config.type === 'pie') return labels.map((l, i) => `${l}${TAB}${ds[0]?.data[i] ?? ''}`).join('\n');
  return [TAB + ds.map((d) => d.label || '').join(TAB), ...labels.map((l, i) => l + TAB + ds.map((d) => d.data[i] ?? '').join(TAB))].join('\n');
}
const fieldVal = (e) => e.tagName === 'SELECT' ? [...e.selectedOptions].map((o) => o.textContent.trim()).join('، ') : e.type === 'checkbox' ? (e.checked ? '✓' : '✗') : e.value;
function txt(n) {
  if (n.nodeType === 3) return n.data;
  if (n.nodeType !== 1) return '';
  const el = n, tag = el.tagName;
  if (['SCRIPT', 'STYLE', 'BUTTON'].includes(tag) || el.classList.contains('hint') || el.classList.contains('ht') || el.hidden) return '';
  if (tag === 'CANVAS') { const c = chartOf(el); return c ? '\n' + chartText(c) + '\n' : ''; }
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return el.type === 'range' ? '' : fieldVal(el);
  if (tag === 'TABLE') return '\n' + [...el.rows].map((r) => [...r.cells].map((c) => clean(txt(c)).replace(/\n/g, ' ')).join(TAB)).join('\n') + '\n';
  if (tag === 'LABEL' && el.querySelector('input,select,textarea')) { const f = el.querySelector('input,select,textarea'), t = clean([...el.childNodes].filter((x) => !x.contains?.(f) && x !== f).map(txt).join(' ')); return '\n' + (t ? t + ': ' : '') + fieldVal(f) + '\n'; }
  const inner = [...el.childNodes].map(txt).join(el.classList.contains('row') ? ' · ' : '');
  return /^(DIV|P|H[1-6]|LI|UL|OL|SECTION|DETAILS|SUMMARY|TR)$/.test(tag) || el.classList.contains('kpi') ? '\n' + inner + '\n' : inner;
}
export const cardText = (card) => clean(txt(card)).replaceAll(TAB, '\t');

// ملخص سردي: جمل متصلة تُبنى من بيانات البطاقة نفسها (مؤشر، مخطط، جدول، حقول)
const L = (ar, en) => (getLang() === 'en' ? en : ar);
const nf = (v) => (typeof v === 'number' ? v.toLocaleString(getLang() === 'en' ? 'en-US' : 'ar-EG-u-nu-latn', { maximumFractionDigits: 1 }) : String(v));
const num = (v) => { if (/\/|\s/.test(String(v).trim())) return null; const n = parseFloat(String(v).replace(/[,٬%]/g, '')); return Number.isFinite(n) ? n : null; };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const join = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(L('، ', ', ')) + L(' و', ' and ') + a.at(-1);
function chartNarr(c) {
  const labels = c.data.labels || [], out = [];
  if (c.config.type === 'doughnut' || c.config.type === 'pie') {
    const v = (c.data.datasets[0]?.data || []).map((x) => num(x) ?? 0), tot = sum(v);
    if (!tot) return L('لا توجد بيانات.', 'No data.');
    const o = v.map((x, i) => [labels[i], x]).sort((a, b) => b[1] - a[1]);
    return L(`الإجمالي ${nf(tot)} موزّعة على ${o.length} فئات؛ الأكبر «${o[0][0]}» بـ${nf(o[0][1])} (${Math.round(o[0][1] / tot * 100)}%)`, `The total of ${nf(tot)} is split across ${o.length} categories; the largest is "${o[0][0]}" with ${nf(o[0][1])} (${Math.round(o[0][1] / tot * 100)}%)`) + (o.length > 1 ? L(`، يليه «${o[1][0]}» بـ${nf(o[1][1])}.`, `, followed by "${o[1][0]}" with ${nf(o[1][1])}.`) : '.');
  }
  (c.data.datasets || []).forEach((d) => {
    const ok = (d.data || []).map((x, i) => [labels[i], num(x)]).filter((x) => x[1] !== null);
    if (!ok.length) return;
    const hi = ok.reduce((a, b) => (b[1] > a[1] ? b : a)), lo = ok.reduce((a, b) => (b[1] < a[1] ? b : a)), tot = sum(ok.map((x) => x[1])), n = d.label ? `«${d.label}»` : L('السلسلة', 'the series');
    let s = L(`بلغ مجموع ${n} ${nf(tot)} عبر ${ok.length} نقاط`, `${n} totals ${nf(tot)} across ${ok.length} points`);
    if (ok.length > 1 && hi[1] !== lo[1]) s += L(`؛ أعلاها «${hi[0]}» (${nf(hi[1])}) وأدناها «${lo[0]}» (${nf(lo[1])})`, `; the highest is "${hi[0]}" (${nf(hi[1])}) and the lowest "${lo[0]}" (${nf(lo[1])})`);
    if (ok.length > 2 && ok.every((x) => /\d/.test(String(x[0])))) { const a = ok[0][1], z = ok.at(-1)[1]; s += z > a ? L('، والاتجاه العام تصاعدي', ', with an upward trend overall') : z < a ? L('، والاتجاه العام تنازلي', ', with a downward trend overall') : L('، والاتجاه العام مستقر', ', with a stable trend overall'); }
    out.push(s + '.');
  });
  return out.join(' ') || L('لا توجد بيانات.', 'No data.');
}
function tableNarr(tb) {
  const rows = [...tb.rows].map((r) => [...r.cells].map((c) => clean(txt(c)).replace(/\n/g, ' '))).filter((r) => r.some(Boolean));
  if (rows.length < 2) return '';
  const head = rows[0], body = rows.slice(1), cols = head.length;
  let s = L(`يضم الجدول ${body.length} صفًا و${cols} أعمدة (${head.filter(Boolean).slice(0, 6).join('، ')}). `, `The table has ${body.length} rows and ${cols} columns (${head.filter(Boolean).slice(0, 6).join(', ')}). `);
  const ci = head.findIndex((_, i) => i > 0 && body.filter((r) => num(r[i]) !== null).length >= body.length / 2);
  if (ci > 0) { const v = body.filter((r) => num(r[ci]) !== null), top = v.reduce((a, b) => (num(b[ci]) > num(a[ci]) ? b : a)), tot = sum(v.map((r) => num(r[ci])));
    s += L(`مجموع «${head[ci]}» ${nf(tot)}، وأعلى قيمة لدى «${top[0]}» (${top[ci]}). `, `The total of "${head[ci]}" is ${nf(tot)}, and the highest value belongs to "${top[0]}" (${top[ci]}). `); }
  const sh = body.slice(0, 5).map((r) => r[0] + (r[1] ? ` (${r.slice(1, 3).filter(Boolean).join(' / ')})` : ''));
  return s + L(`من الصفوف: ${join(sh)}${body.length > 5 ? ' وغيرها' : ''}.`, `Rows include ${join(sh)}${body.length > 5 ? ' and more' : ''}.`);
}
export function cardNarrative(card) {
  const lines = clean(txt(card)).split('\n').map((x) => x.replaceAll(TAB, ' ').trim()).filter(Boolean);
  if (card.classList.contains('kpi')) { const val = lines.find((l) => num(l) !== null) || lines[0], lab = lines.filter((l) => l !== val).join(' — '); return L(`مؤشر «${lab}» يسجّل ${val}.`, `The "${lab}" indicator stands at ${val}.`); }
  const title = card.querySelector('h2,h3,h4')?.textContent.trim().replace(/\s+/g, ' '), parts = [];
  if (title) parts.push(title + '.');
  const walkN = (el) => {
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'BUTTON'].includes(tag) || el.classList.contains('hint') || el.classList.contains('ht') || el.hidden || el.matches('h2,h3,h4') || el.id === 'cardtools') return;
    if (tag === 'CANVAS') { const c = chartOf(el); if (c) parts.push(chartNarr(c)); return; }
    if (tag === 'TABLE') { const t = tableNarr(el); if (t) parts.push(t); return; }
    if (tag === 'LABEL' && el.querySelector('input,select,textarea')) { const f = el.querySelector('input,select,textarea'), t = clean([...el.childNodes].filter((x) => x !== f && !x.contains?.(f)).map(txt).join(' ')), v = fieldVal(f); if (v && f.type !== 'range') parts.push((t ? t + ': ' : '') + v + '.'); return; }
    if (el.querySelector('canvas,table,label,h2,h3,h4') || [...el.children].some((c) => /^(DIV|UL|OL|SECTION)$/.test(c.tagName))) { [...el.children].forEach(walkN); return; }
    const t = clean(txt(el)).replace(/\n/g, ' ').replaceAll(TAB, ' '); if (t) parts.push(/[.!؟?]$/.test(t) ? t : t + '.');
  };
  [...card.children].forEach(walkN);
  return parts.join(' ') || lines.join('. ') + '.';
}
const solid = () => getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
async function clip(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* قد يمنعها المتصفح: بديل قديم */ }
  const ta = Object.assign(document.createElement('textarea'), { value: text }); ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* لا شيء */ } ta.remove(); return ok;
}
async function copyImage(card) {
  const blob = await toBlob(card, { pixelRatio: 2, backgroundColor: solid(), style: { background: solid(), boxShadow: 'none', margin: '0' }, filter: (n) => !(n.classList && (n.classList.contains('cg') || n.id === 'cardtools')) });
  if (!blob) throw new Error('empty');
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); return 'copied'; }
  catch { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'nawa-card.png' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return 'downloaded'; }
}
export function initCopy({ toast }) {
  T = toast;
  tools = document.createElement('div'); tools.id = 'cardtools';
  tools.innerHTML = '<button data-cc="img" title="نسخ كصورة" aria-label="نسخ كصورة"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg></button><button data-cc="txt" title="نسخ الملخص (نص)" aria-label="نسخ الملخص (نص)"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg></button><button data-cc="nar" title="نسخ ملخص سردي" aria-label="نسخ ملخص سردي"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 11h16M4 16h10"/></svg></button>';
  document.body.append(tools);
  const show = (card) => { cur = card; const r = card.getBoundingClientRect(), w = tools.offsetWidth || 72; tools.style.top = Math.max(2, r.top - 14) + 'px'; tools.style.left = Math.min(Math.max(4, document.documentElement.dir === 'rtl' ? r.left + 12 : r.right - w - 12), innerWidth - w - 4) + 'px'; tools.style.display = 'flex'; };
  document.addEventListener('mousemove', (e) => { if (tools.contains(e.target)) return; const c = e.target.closest?.('.card'); if (c && !c.closest('#panel,.dlg')) { if (c !== cur || tools.style.display !== 'flex') show(c); } else { tools.style.display = 'none'; cur = null; } });
  addEventListener('scroll', () => { tools.style.display = 'none'; cur = null; }, true);
  tools.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cc]'); if (!b || !cur) return; const card = cur;
    try {
      if (b.dataset.cc === 'txt') { const t = cardText(card); T((await clip(t)) ? 'تم نسخ الملخص' : 'تعذّر النسخ'); }
      else if (b.dataset.cc === 'nar') { T((await clip(cardNarrative(card))) ? 'تم نسخ الملخص السردي' : 'تعذّر النسخ'); }
      else { const r = await copyImage(card); T(r === 'copied' ? 'تم نسخ الصورة' : 'تعذّر النسخ إلى الحافظة، نُزّلت الصورة بدلاً منه'); }
    } catch (err) { console.error(err); T('تعذّر النسخ'); }
  });
}
