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
  document.addEventListener('mouseover', (e) => { const h = e.target.closest?.('.hint,[data-tip]'); if (h) showPop(h); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.hint,[data-tip]')) hidePop(); });
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
