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
export function initUx() {
  document.addEventListener('focusin', (e) => expand(e.target));
  document.addEventListener('input', (e) => { if (e.target.classList?.contains('xin')) expand(e.target); }, true);
  document.addEventListener('change', (e) => { if (e.target.classList?.contains('xin')) expand(e.target); }, true);
  document.addEventListener('focusout', (e) => { const el = e.target; if (el.classList?.contains('xin')) setTimeout(() => { if (document.activeElement !== el) restore(el); }, 120); });
}
