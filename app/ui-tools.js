// أدوات الواجهة: الوضع المظلم، أيقونات الإشعارات والتلميحات، وتحويل الملاحظات التوجيهية إلى تلميحات منبثقة
import { walk, tr } from './i18n.js';
const ICONS = {
  bell: '<svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.9.7 1.5 1.6 1.5 2.6h4c0-1 .6-1.9 1.5-2.6A6 6 0 0 0 12 3z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M9 16l2 2 4-4"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/></svg>',
  idcard: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M15 10h3.5M15 14h3.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4v.1"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};
export const icon = (k) => ICONS[k];
// ---- الوضع المظلم ----
export const getTheme = () => document.documentElement.dataset.theme || 'light';
export function initTheme() {
  let t = null; try { t = localStorage.getItem('nawa.theme'); } catch { /* خاص */ }
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t, false);
}
export function setTheme(t, store = true) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#140e0f' : '#A21008');
  if (store) { try { localStorage.setItem('nawa.theme', t); } catch { /* خاص */ } }
}
export const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');
// ---- لوحة منسدلة (إشعارات/تلميحات) ----
let panel;
export function openPanel(html) {
  if (!panel) { panel = document.createElement('div'); panel.id = 'panel'; document.body.append(panel); document.addEventListener('mousedown', (e) => { if (panel.style.display === 'block' && !panel.contains(e.target) && !e.target.closest('.ic,.cg')) closePanel(); }); document.addEventListener('keydown', (e) => e.key === 'Escape' && closePanel()); }
  panel.innerHTML = html; panel.style.display = 'block'; walk(panel);
}
export const closePanel = () => { if (panel) panel.style.display = 'none'; };
// ---- التلميحات ----
const POP = () => document.getElementById('hintpop') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'hintpop', role: 'tooltip' }));
function showPop(h) {
  const p = POP(); if (h.dataset.tip) p.textContent = h.dataset.tip; else p.innerHTML = h.querySelector('.ht').innerHTML; p.style.display = 'block';
  const r = h.getBoundingClientRect(), w = p.offsetWidth, ph = p.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 8; if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 8);
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
const hidePop = () => { const p = document.getElementById('hintpop'); if (p) p.style.display = 'none'; document.querySelectorAll('.hint.on').forEach((e) => e.classList.remove('on')); };
export function initHints(view) {
  const noHover = () => matchMedia('(hover: none)').matches;
  document.addEventListener('mouseover', (e) => { if (noHover()) return; const h = e.target.closest?.('.hint,[data-tip]'); if (h) showPop(h); });
  document.addEventListener('mouseout', (e) => { if (noHover()) return; if (e.target.closest?.('.hint,[data-tip]')) hidePop(); });
  document.addEventListener('focusin', (e) => { const h = e.target.closest?.('.hint,[data-tip]'); if (h) showPop(h); });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('.hint,[data-tip]')) hidePop(); });
  document.addEventListener('click', (e) => { const h = e.target.closest?.('.hint,[data-tip]'); if (h) { h.classList.toggle('on'); h.classList.contains('on') ? showPop(h) : hidePop(); } else hidePop(); });
  const run = () => hintify(view());
  new MutationObserver(run).observe(view(), { childList: true, subtree: true }); run();
}
// الملاحظة التوجيهية (p.small تلي عنواناً داخل بطاقة) تتحول إلى أيقونة ⓘ بجانب العنوان
export function hintify(root) {
  if (!root) return;
  for (const p of root.querySelectorAll('p.small:not([id])')) {
    if (!p.closest('.card') && p.parentNode !== root) continue;
    if (p.textContent.trim().length < 20 || p.querySelector('input,button,select')) continue;
    let h = p.previousElementSibling; if (!h || !/^H[23]$/.test(h.tagName)) { const n = p.nextElementSibling; h = n?.classList.contains('card') ? n.querySelector(':scope>h2') : null; }
    if (!h && p.textContent.trim().length >= 40) h = p.closest('.card')?.querySelector(':scope>h2,:scope>h3');
    if (!h) continue;
    const s = document.createElement('span'); s.className = 'hint'; s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'تلميح');
    s.innerHTML = `<span class="hi">i</span><span class="ht" hidden>${p.innerHTML}</span>`; walk(s); h.append(s); p.remove();
  }
}
export function hintsHtml(view) {
  const items = [...view.querySelectorAll('.hint .ht')].map((e) => { const h = e.closest('h2,h3'); return `<li><b>${(h?.firstChild?.textContent || '').trim()}</b><br>${e.innerHTML}</li>`; });
  return `<h3>${tr('التلميحات')}</h3>` + (items.length ? `<ul>${items.join('')}</ul>` : `<p class="small">${tr('لا توجد تلميحات في هذه الشاشة.')}</p>`);
}

// ===== نصوص توضيحية تلقائية لحقول الإدخال (مثال على صيغة التعبئة) =====
// تُستنتج من نوع الحقل وعنوانه؛ ما فيه placeholder مكتوب يدويًا لا يُمسّ.
const PH_RULES = [
  [/رمز المشروع/, 'مثال: GIZ-2026'], [/العملة/, 'مثال: USD'], [/جغراف|المنطقة|النطاق/, 'مثال: دير البلح — قطاع غزة'], [/الهدف/, 'مثال: تعزيز الصحة النفسية للأطفال'], [/ملخص|الشرح/, 'مثال: وصف مختصر للتدخل'], [/اسم البند|البند/, 'مثال: مواد تعليمية'],
  [/بريد|e-?mail/i, 'example@gmail.com'], [/هاتف|جوال|phone|mobile|tel\b/i, '0591234567'], [/هوية/, '123456789'], [/رابط|url|الخادم|server/i, 'https://example.org'],
  [/الاسم الرباعي|اسم المستفيد|الاسم الكامل/, 'مثال: محمد أحمد علي سالم'], [/منشّط|منشط|منسق|educator|facilitator/i, 'مثال: سلمى أحمد'], [/مركز|center/i, 'مثال: مركز الزيتونة'],
  [/ممول|donor/i, 'مثال: GIZ'], [/مشروع|project/i, 'مثال: مشروع الحكايات'], [/مكان|قاعة|venue/i, 'مثال: القاعة الرئيسية'], [/جهة|body/i, 'مثال: وزارة التربية والتعليم'],
  [/عنوان|موضوع|اسم الدورة|اسم النشاط|اسم الاستبيان|title/i, 'مثال: ورشة الحكاية الشعبية'], [/مرجع|دليل|ref|رقم الفاتورة/i, 'مثال: رقم الفاتورة أو المحضر'], [/ملاحظ|note/i, 'ملاحظات اختيارية'],
  [/بحث|search/i, 'ابحث…'], [/مجموعة|شعبة/, 'اختياري (أ، ب…)'], [/وصف|تعريف/, 'وصف مختصر'], [/اسم/, 'مثال: اكتب الاسم'],
];
const PH_NUM = [[/وحدات/, '1'], [/ميزانية|حصة|مصروف|مبلغ|تكلفة|قيمة/, '50000'], [/عمر من|من عمر/, '6'], [/^إلى$/, '18'], [/عمر/, '12'], [/نسبة|%|pct/i, '80'], [/ساعات|مدة/, '3'], [/عدد|كمية|qty|مستفيد/i, '25'], [/أعلى|max/i, '100'], [/أدنى|min/i, '0']];
function labelOf(el) {
  const lab = el.closest('label'); if (lab) return [...lab.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('input,select,textarea,.fh'))).map((n) => n.textContent).join(' ').trim();
  const td = el.closest('td'); if (td) { const i = td.cellIndex, t = td.closest('table'), th = t?.rows[0]?.cells[i]; if (th) return th.textContent.trim(); }
  return el.getAttribute('aria-label') || el.id || el.getAttribute('data-bind') || '';
}
export function phFor(el) {
  const t = (el.type || 'text').toLowerCase(), L = labelOf(el);
  if (['file', 'checkbox', 'radio', 'range', 'date', 'time', 'hidden', 'color', 'button', 'submit', 'datetime-local', 'month'].includes(t) || el.readOnly || el.disabled) return null;
  if (t === 'email') return 'example@gmail.com'; if (t === 'tel') return '0591234567'; if (t === 'url') return 'https://example.org';
  if (t === 'password') return null;
  if (t === 'number') { for (const [r, p] of PH_NUM) if (r.test(L)) return p; return '0'; }
  for (const [r, p] of PH_RULES) if (r.test(L)) return p;
  if (el.tagName === 'TEXTAREA') return /سطر|lines/.test(L) || el.dataset.lines ? 'سطر لكل بند' : 'اكتب هنا…';
  return 'اكتب هنا…';
}
export function fillPlaceholders(root = document) {
  root.querySelectorAll?.('input:not([placeholder]),textarea:not([placeholder])').forEach((el) => { const p = phFor(el); if (p) el.setAttribute('placeholder', p); });
}
export function initPlaceholders() {
  let raf = 0; const run = () => { raf = 0; fillPlaceholders(document.body); };
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
  run();
}
