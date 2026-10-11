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
  tools.innerHTML = '<button data-cc="img" title="نسخ كصورة" aria-label="نسخ كصورة"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg></button><button data-cc="txt" title="نسخ الملخص (نص)" aria-label="نسخ الملخص (نص)"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg></button>';
  document.body.append(tools);
  const show = (card) => { cur = card; const r = card.getBoundingClientRect(), w = tools.offsetWidth || 72; tools.style.top = Math.max(2, r.top - 14) + 'px'; tools.style.left = Math.min(Math.max(4, document.documentElement.dir === 'rtl' ? r.left + 12 : r.right - w - 12), innerWidth - w - 4) + 'px'; tools.style.display = 'flex'; };
  document.addEventListener('mousemove', (e) => { if (tools.contains(e.target)) return; const c = e.target.closest?.('.card'); if (c && !c.closest('#panel,.dlg')) { if (c !== cur || tools.style.display !== 'flex') show(c); } else { tools.style.display = 'none'; cur = null; } });
  addEventListener('scroll', () => { tools.style.display = 'none'; cur = null; }, true);
  tools.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cc]'); if (!b || !cur) return; const card = cur;
    try {
      if (b.dataset.cc === 'txt') { const t = cardText(card); T((await clip(t)) ? 'تم نسخ الملخص' : 'تعذّر النسخ'); }
      else { const r = await copyImage(card); T(r === 'copied' ? 'تم نسخ الصورة' : 'تعذّر النسخ إلى الحافظة، نُزّلت الصورة بدلاً منه'); }
    } catch (err) { console.error(err); T('تعذّر النسخ'); }
  });
}
