// راحة الاستخدام على الشاشات الصغيرة: (1) جداول الإدخال تتحول إلى بطاقات مُعنوَنة، (2) حقل النص الطويل يتوسّع عند الضغط ليُظهر قيمته كاملة
const TEXT = new Set(['text', 'search', 'tel', 'email', 'url', '']);
const SKIP = '[readonly],[disabled],[data-noexpand],[list],.nx';
let ov = null;

// ---- 1) الجداول: نسخ عناوين الأعمدة إلى كل خلية لتُعرض كبطاقة عند الشاشات الصغيرة ----
export function stackTables(root = document.getElementById('view')) {
  if (!root) return;
  for (const t of root.querySelectorAll('table')) {
    if (t.dataset.stk === '1' || t.classList.contains('nostack')) continue;
    const head = t.rows[0]; if (!head || ![...head.cells].every((c) => c.tagName === 'TH')) continue;
    const edit = !!t.querySelector('tr:not(:first-child) input:not([type=checkbox]):not([type=radio]), tr:not(:first-child) select, tr:not(:first-child) textarea');
    const lst = !edit && head.cells.length >= 4 && !!t.querySelector('tr:not(:first-child) td:last-child button') && !t.closest('.nostack,#panel');
    if (!edit && !lst) continue;
    const labels = [...head.cells].map((c) => c.textContent.trim());
    for (const tr of [...t.rows].slice(1)) [...tr.cells].forEach((td, i) => { if (labels[i] && !td.dataset.l) td.dataset.l = labels[i]; });
    t.dataset.stk = '1'; t.classList.add('stk'); if (lst) t.classList.add('lst');
  }
}

// ---- 2) حقل إدخال يتوسع: نافذة كتابة أكبر تعكس القيمة في الحقل الأصلي ----
const closeOv = (commit = true) => { if (!ov) return; const { el, w } = ov; ov = null; w.remove(); if (commit) { el.dispatchEvent(new Event('change', { bubbles: true })); } };
function open(el) {
  if (ov) return;
  const lab = (el.closest('label')?.firstChild?.textContent || el.getAttribute('aria-label') || el.placeholder || el.dataset.l || el.closest('td')?.dataset.l || '').trim();
  const w = document.createElement('div'); w.className = 'xp-bg'; w.setAttribute('role', 'dialog');
  w.innerHTML = '<div class="xp"><div class="xp-h"><span></span><button type="button" class="xp-ok">تم</button></div><textarea rows="2"></textarea></div>';
  w.querySelector('span').textContent = lab; const ta = w.querySelector('textarea'); ta.value = el.value; ta.dir = el.dir || (/^[\x00-\x7f]*$/.test(el.value) && el.type !== 'text' ? 'ltr' : getComputedStyle(el).direction); ta.placeholder = el.placeholder || ''; if (el.maxLength > 0) ta.maxLength = el.maxLength;
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, innerHeight * 0.4) + 'px'; };
  const place = () => { const vv = window.visualViewport; w.style.top = (vv ? vv.offsetTop : 0) + 'px'; w.style.height = (vv ? vv.height : innerHeight) + 'px'; };
  ta.addEventListener('input', () => { el.value = ta.value; el.dispatchEvent(new Event('input', { bubbles: true })); fit(); });
  const done = () => closeOv(true);
  w.querySelector('.xp-ok').onclick = done; w.addEventListener('mousedown', (e) => { if (e.target === w) { e.preventDefault(); done(); } });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); done(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(); } });
  document.body.appendChild(w); ov = { el, w }; place(); window.visualViewport?.addEventListener('resize', place); fit();
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
const overflows = (el) => el.scrollWidth > el.clientWidth + 1 || (el.value || '').length > 28;
export function initMobileUx() {
  const view = document.getElementById('view'); if (!view) return;
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => stackTables(view), 60); }).observe(view, { childList: true, subtree: true });
  stackTables(view);
  document.addEventListener('focusin', (e) => {
    const el = e.target; if (!(el instanceof HTMLInputElement) || el.closest('.xp-bg,.dlg') || el.matches(SKIP) || !TEXT.has(el.type)) return;
    if (!el.closest('#view') || innerWidth > 800) return;
    if (el.value && overflows(el)) { el.blur(); open(el); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target; if (ov || innerWidth > 800 || !(el instanceof HTMLInputElement) || el.closest('.xp-bg,.dlg') || el.matches(SKIP) || !TEXT.has(el.type) || !el.closest('#view')) return;
    if (e.isTrusted && el.scrollWidth > el.clientWidth + 1) { el.blur(); open(el); }
  }, true);
}
