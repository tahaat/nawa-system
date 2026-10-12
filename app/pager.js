// شريط ترقيم صفحات موحّد لكل الجداول: إظهار a إلى b من N · أرقام مختصرة · أول/سابق/تالي/أخير · عدد الصفوف
import { getLang } from './i18n.js';
const S = {}, SIZES = [10, 25, 50, 100], KEY = 'nawa.pgsize';
const size0 = () => { try { const v = +localStorage.getItem(KEY); return SIZES.includes(v) ? v : 25; } catch { return 25; } };
let SZ = size0();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function pagerNums(p, pages) { // أرقام مختصرة: 1 … 4 5 6 … 20
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i);
  const s = new Set([0, pages - 1, p - 1, p, p + 1]); if (p < 3) [1, 2, 3].forEach((i) => s.add(i)); if (p > pages - 4) [pages - 2, pages - 3, pages - 4].forEach((i) => s.add(i));
  const a = [...s].filter((i) => i >= 0 && i < pages).sort((x, y) => x - y), out = []; a.forEach((i, k) => { if (k && i - a[k - 1] > 1) out.push('…'); out.push(i); }); return out;
}
// id فريد للجدول، total عدد الصفوف، redraw يعيد رسم الجدول، sig توقيع الفلاتر (تغيّره يعيد للصفحة الأولى)
export function pager(id, total, redraw, sig = '') {
  const s = (S[id] ||= { p: 0, sig }); if (s.sig !== sig) { s.sig = sig; s.p = 0; } if (redraw) s.redraw = redraw;
  const n = SZ, pages = Math.max(1, Math.ceil(total / n)); s.p = Math.min(Math.max(0, s.p), pages - 1);
  const from = total ? s.p * n + 1 : 0, to = Math.min(total, (s.p + 1) * n), en = getLang() === 'en', rtl = !en;
  const g = (a, b) => (rtl ? a : b), btn = (lab, t, dis, cls = '', ttl = '') => `<button class="sec pgb ${cls}" data-pg="${id}|${t}" ${dis ? 'disabled' : ''} ${ttl ? `title="${ttl}" aria-label="${ttl}"` : ''}>${lab}</button>`;
  const html = (extra = '') => total <= 10 ? '' : `<div class="pgbar" data-notr>
    <span class="pgt">${en ? `Showing ${from} to ${to} of ${total} entries` : `إظهار ${from} إلى ${to} من ${total} الإدخالات`}</span>
    <span class="pgn">${btn(g('»', '«'), 'first', s.p === 0, '', en ? 'First' : 'الأولى')}${btn(g('›', '‹'), 'prev', s.p === 0, '', en ? 'Previous' : 'السابق')}${pagerNums(s.p, pages).map((i) => (i === '…' ? '<span class="pgd">…</span>' : `<button class="sec pgb${i === s.p ? ' on' : ''}" data-pg="${id}|${i}">${i + 1}</button>`)).join('')}${btn(g('‹', '›'), 'next', s.p >= pages - 1, '', en ? 'Next' : 'التالي')}${btn(g('«', '»'), 'last', s.p >= pages - 1, '', en ? 'Last' : 'الأخيرة')}</span>
    <select class="pgs" data-pgs="${id}" aria-label="${en ? 'Rows per page' : 'عدد الصفوف'}">${SIZES.map((x) => `<option ${x === SZ ? 'selected' : ''}>${x}</option>`).join('')}</select>${extra}</div>`;
  return { p: s.p, n, pages, total, from, to, slice: (arr) => arr.slice(s.p * n, s.p * n + n), start: s.p * n, html };
}
export const resetPage = (id) => { if (S[id]) S[id].p = 0; };
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-pg]'); if (!b || b.disabled) return; const [id, t] = b.dataset.pg.split('|'), s = S[id]; if (!s) return; e.preventDefault(); e.stopPropagation();
  const last = Infinity; s.p = t === 'first' ? 0 : t === 'last' ? last : t === 'prev' ? s.p - 1 : t === 'next' ? s.p + 1 : +t; s.redraw?.(id);
}, true);
document.addEventListener('change', (e) => {
  const x = e.target.closest?.('[data-pgs]'); if (!x) return; e.stopPropagation(); SZ = +x.value; try { localStorage.setItem(KEY, String(SZ)); } catch {}
  for (const k of Object.keys(S)) S[k].p = 0; S[x.dataset.pgs]?.redraw?.(x.dataset.pgs);
}, true);
