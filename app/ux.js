// تحسينات تجربة الاستخدام العامة: (1) توسّع حقل الإدخال عند التركيز ليُظهر القيمة كاملة
// (2) جداول التحرير تتحول إلى بطاقات على الشاشات الضيقة
const TXT = 'input:not([type]),input[type=text],input[type=search],input[type=email],input[type=tel],input[type=url],input[type=number],select,textarea';
const cv = document.createElement('canvas').getContext('2d');
function need(el) { // العرض اللازم لإظهار النص كاملًا
  const cs = getComputedStyle(el); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  let t = el.tagName === 'SELECT' ? (el.selectedOptions[0]?.text || '') : el.value || '';
  if (el.tagName === 'TEXTAREA') return 0;
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + (el.tagName === 'SELECT' ? 34 : 6) + 4;
  return Math.ceil(cv.measureText(t).width + pad);
}
function expand(el) {
  if (!el.matches?.(TXT) || el.tagName === 'TEXTAREA' || el.closest('.dlg-bg,#splash,.xp-bg') || innerWidth <= 800) return;
  if (el.dataset.w0 == null) { el.dataset.w0 = el.getBoundingClientRect().width; el.dataset.m0 = el.style.cssText; }
  const w0 = +el.dataset.w0, vw = document.documentElement.clientWidth, r = el.getBoundingClientRect();
  const want = Math.min(Math.max(w0, need(el)), Math.min(560, vw - 16));
  if (want <= w0 + 1) { restore(el); return; }
  const dir = getComputedStyle(el).direction, extra = want - w0;
  // اتجاه التوسّع: نحو الجهة الأرحب في الشاشة دون تحريك بقية التخطيط (هامش سالب يعادل الزيادة)
  const spaceL = r.left, spaceR = vw - r.right, toLeft = spaceL >= spaceR || spaceR < extra ? spaceL >= extra || spaceL >= spaceR : false;
  el.classList.add('xin'); el.style.width = want + 'px'; el.style.maxWidth = 'none'; el.style.minWidth = want + 'px';
  el.style.marginLeft = toLeft ? -extra + 'px' : ''; el.style.marginRight = toLeft ? '' : -extra + 'px';
}
function restore(el) {
  if (el.dataset.w0 == null) return;
  el.classList.remove('xin'); el.style.cssText = el.dataset.m0 || ''; delete el.dataset.w0; delete el.dataset.m0;
}
// جداول التحرير → بطاقات (تُعلَّم بصنف rc وتُعطى تسميات الأعمدة)
function cardify(root = document) {
  root.querySelectorAll('#view table:not([data-rc])').forEach((t) => {
    t.dataset.rc = '1';
    const rows = [...t.rows]; if (rows.length < 2) return;
    const head = rows[0], ths = [...head.cells]; if (!ths.length || ths.some((c) => c.tagName !== 'TH')) return;
    if (!t.querySelector('td input,td select,td textarea') || ths.length < 3) return;
    if (rows.slice(1).some((r) => [...r.cells].some((c) => c.colSpan > 1 || c.rowSpan > 1) || r.cells.length !== ths.length)) return;
    t.classList.add('rc');
    for (const r of rows.slice(1)) [...r.cells].forEach((c, i) => c.setAttribute('data-l', ths[i].textContent.trim()));
  });
}
// ---- حقول النص: تتحول إلى مربعات تلتف أسطرها فتظهر القيمة كاملة (بدل القص) ----
const WRAP = '#view input[data-bind]:not([type]),#view input[data-bind][type=text],#view td input:not([type]),#view td input[type=text]';
const fitTa = (t) => { if (!t.offsetParent && !t.getClientRects().length) return; t.style.height = 'auto'; const h = t.scrollHeight; if (h > 0) t.style.height = h + 2 + 'px'; };
function wrapAll(root = document) {
  root.querySelectorAll(WRAP).forEach((i) => {
    if (i.matches('[list],[data-noexpand],[readonly],[disabled],.nx') || i.closest('.dlg-bg,#panel,#sfbar')) return;
    const t = document.createElement('textarea');
    for (const a of i.attributes) if (!['type', 'value', 'autocomplete', 'size'].includes(a.name)) t.setAttribute(a.name, a.value);
    t.value = i.value; t.rows = 1; t.classList.add('wrapta'); i.replaceWith(t); fitTa(t);
  });
}
// ---- قائمة متعددة الاختيار: ملخص بشرائح تلتف أسطرها + قائمة خانات اختيار عند الفتح (بدل صندوق التمرير الأصلي) ----
const escH = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function msel(sel) {
  if (sel.dataset.ms) return; sel.dataset.ms = '1';
  const d = document.createElement('details'); d.className = 'msel';
  const paint = () => { const on = [...sel.options].filter((o) => o.selected); d.querySelector('summary').innerHTML = on.length ? on.map((o) => `<span class="chip">${escH(o.text)}</span>`).join('') : '<span class="ph">— اختر —</span>'; };
  d.innerHTML = `<summary></summary><div class="mslist">${[...sel.options].map((o, i) => `<label><input type="checkbox" data-i="${i}" ${o.selected ? 'checked' : ''}><span>${escH(o.text)}</span></label>`).join('')}</div>`;
  d.addEventListener('change', (e) => { const c = e.target; if (c.dataset.i == null) return; e.stopPropagation(); sel.options[+c.dataset.i].selected = c.checked; paint(); sel.dispatchEvent(new Event('change', { bubbles: true })); });
  sel.style.display = 'none'; sel.after(d); paint();
}
export function initUx() {
  document.addEventListener('click', (e) => { document.querySelectorAll('details.msel[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
  document.addEventListener('input', (e) => { if (e.target.classList?.contains('wrapta')) fitTa(e.target); });
  document.addEventListener('focusin', (e) => { if (e.target.classList?.contains('wrapta')) fitTa(e.target); });
  document.addEventListener('keydown', (e) => { const t = e.target; if (t.classList?.contains('wrapta') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); t.blur(); } });
  window.addEventListener('resize', () => document.querySelectorAll('textarea.wrapta').forEach(fitTa));
  const v = document.getElementById('view'); let t;
  if (v) new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { wrapAll(v); v.querySelectorAll('textarea.wrapta').forEach(fitTa); v.querySelectorAll('select[multiple][data-bind]').forEach(msel); }, 40); }).observe(v, { childList: true, subtree: true });
  wrapAll(v);
  document.addEventListener('focusin', (e) => expand(e.target));
  document.addEventListener('input', (e) => { if (e.target.classList?.contains('xin')) expand(e.target); }, true);
  document.addEventListener('change', (e) => { if (e.target.classList?.contains('xin')) expand(e.target); }, true);
  document.addEventListener('focusout', (e) => { const el = e.target; if (el.classList?.contains('xin')) setTimeout(() => { if (document.activeElement !== el) restore(el); }, 120); });
}
