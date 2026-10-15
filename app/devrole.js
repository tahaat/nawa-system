// اختيار دور الجهاز + رموز الأدوار العليا (وضع مجلد OneDrive فقط). الحماية الفعلية = مشاركة المجلدات؛ هذا تسهيل وتقليل أخطاء.
import { DEV_ROLES, PIN_ROLES, PIN_MIN, needsPin, roleMe, makeVerifier, checkPin, fpOf } from '../core/roles.js';
import { dirFromHandle } from './fsdir.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'nawa.devrole';
let C, fails = 0, lockUntil = 0;
export const initDevRole = (c) => {
  C = c; wireEyes(document);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target?.id?.startsWith('pin_')) { e.preventDefault(); document.querySelector('[data-act=pinsSave]')?.click(); } });
};
const active = () => !!C && C.isFolder() && !C.inArtifact();
const load = () => { try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); return r && DEV_ROLES[r.role] ? r : null; } catch { return null; } };
const store = (r) => { try { r ? localStorage.setItem(KEY, JSON.stringify(r)) : localStorage.removeItem(KEY); } catch { /* خاص */ } };
export const devMe = () => { if (!active()) return null; const r = load(); return r ? roleMe(r.role, r.center) : null; };
export const devRoleKey = () => (active() ? load()?.role || '' : '');
export const canManage = () => !active() || !load() || ['admin', 'meal'].includes(load().role);   // بطاقة الفريق
export const canPins = () => !active() || !load() || load().role === 'admin';
export const roleChip = () => { if (!active()) return ''; const r = load(); if (!r) return ''; const cn = r.center ? C.db.centers.find((c) => c.id === r.center)?.name : ''; return `<button class="sec" data-act="roleSwitch" title="تبديل الدور على هذا الجهاز">${esc(DEV_ROLES[r.role].ar)}${cn ? ' · ' + esc(cn) : ''}</button>`; };


// حقل سرّي بزر عين لإظهار/إخفاء ما يُكتب
const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-3.17 4.19M1 1l22 22"/></svg>';
export const eyeIcon = () => EYE;
export const secretInput = (id, { w = '' } = {}) => `<span class="pw"><input id="${id}" type="password" autocomplete="off" dir="ltr" ${w ? `style="width:${w}"` : ''}><button type="button" class="eye" data-eye="${id}" aria-label="إظهار/إخفاء" title="إظهار/إخفاء">${EYE}</button></span>`;
// يربط أزرار العين داخل root (تفويض الأحداث)
export function wireEyes(root) {
  root.addEventListener('click', (e) => { const b = e.target.closest?.('[data-eye]'); if (!b) return; e.preventDefault(); const i = root.querySelector('#' + b.dataset.eye); if (!i) return; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = show ? EYE_OFF : EYE; i.focus(); });
}

// ---- المُتحقِّقات: من core/roles.pin (تصل كل الأجهزة عبر OneDrive) أو النسخة المخزّنة محليًا
async function fromFile(askPerm) {
  const h = C.sync.handle; if (!h) return null;
  try {
    let p = await h.queryPermission({ mode: 'readwrite' }); if (p !== 'granted' && askPerm) p = await h.requestPermission({ mode: 'readwrite' }); if (p !== 'granted') return null;
    const d = dirFromHandle(h); if (!(await d.channels()).includes('core')) return null;
    try { return JSON.parse(await d.read('core', 'roles.pin')); } catch { return { missing: true }; }
  } catch { return null; }
}
export async function getVerifiers(askPerm) {
  const f = await fromFile(askPerm);
  if (f?.roles) { await C.kvSet('rolePins', f); return f.roles; }
  const c = await C.kvGet('rolePins'); return (c && c.roles) || {};
}
export async function savePins(partial) {
  const cur = await getVerifiers(true), obj = { v: 1, at: Date.now(), roles: { ...cur, ...partial } };
  await C.kvSet('rolePins', obj); let wrote = false;
  try { const h = C.sync.handle; if (h && (await h.queryPermission({ mode: 'readwrite' })) === 'granted') { const d = dirFromHandle(h); if ((await d.channels()).includes('core')) { await d.write('core', 'roles.pin', JSON.stringify(obj)); wrote = true; } } } catch { /* */ }
  const r = load(); if (r && partial[r.role]) store({ ...r, fp: fpOf(partial[r.role]) });
  return wrote;
}

// ---- نافذة اختيار الدور
function pick({ cancelable }) {
  return new Promise((res) => {
    const w = document.createElement('div'); w.className = 'dlg-bg'; w.id = 'rolepick'; const dlg = document.createElement('div'); dlg.className = 'dlg'; dlg.style.maxWidth = '520px'; w.append(dlg);
    const q = (s) => dlg.querySelector(s); const close = (v) => { w.remove(); res(v); };
    const msg = (t) => { const m = q('#rp-m'); if (m) m.textContent = t; };
    const set = (role, center, fp) => { store({ role, center: center || '', fp: fp || '' }); close(true); };
    const home = () => {
      dlg.innerHTML = `<h2>اختر دورك على هذا الجهاز</h2><p class="small">الدور يحدد الشاشات الظاهرة لك. ما تراه من بيانات يحدده OneDrive حسب مجموعاتك.</p>
      <div style="display:grid;gap:8px">${Object.entries(DEV_ROLES).filter(([, d]) => !d.hidden).map(([k, d]) => `<button class="sec" data-r="${k}" style="text-align:start">${esc(d.ar)}${d.pin ? ' 🔒' : ''}</button>`).join('')}</div>${cancelable ? '<div class="row" style="margin-top:10px"><button class="sec" id="rp-x">إلغاء</button></div>' : '<p class="small" style="margin-top:10px">جهاز جديد؟ اختر مجلد المزامنة أولًا ثم عُد لاختيار دورك.</p><button class="sec" id="rp-setup">اختيار مجلد المزامنة أولًا</button>'}`;
      dlg.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => step(b.dataset.r)));
      q('#rp-x') && (q('#rp-x').onclick = () => close(false)); q('#rp-setup') && (q('#rp-setup').onclick = () => { set('setup'); setTimeout(() => { C.nav(); C.go('cloud'); }, 0); });
    };
    const step = async (role) => {
      const d = DEV_ROLES[role]; const centers = C.db.centers;
      if (d.center && !centers.length) { dlg.innerHTML = `<h2>${esc(d.ar)}</h2><p>لا توجد مراكز على هذا الجهاز بعد. اختر مجلد المزامنة وزامن أولًا (من «السحابة والمزامنة»)، ثم أعد اختيار الدور.</p><div class="row"><button class="sec" id="rp-b">رجوع</button></div>`; q('#rp-b').onclick = home; return; }
      let boot = false, vs = {};
      if (d.pin) { vs = await getVerifiers(true); boot = role === 'admin' && !Object.keys(vs).length; }
      if (d.pin && !boot && !vs[role]) { dlg.innerHTML = `<h2>${esc(d.ar)}</h2><p>لم يضبط المدير رمز هذا الدور بعد، أو لم يُختَر مجلد المزامنة على هذا الجهاز بعد. اختر المجلد وزامن، ثم أعد المحاولة.</p><div class="row"><button class="sec" id="rp-b">رجوع</button></div>`; q('#rp-b').onclick = home; return; }
      dlg.innerHTML = `<h2>${esc(d.ar)}</h2>
        ${d.center ? `<label>المركز<select id="rp-c">${centers.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>` : ''}
        ${boot ? `<p class="small">لم تُضبط رموز بعد. أنشئ رمز المدير الآن (${PIN_MIN} خانات على الأقل)؛ ثم تضبط رموز بقية الأدوار من «السحابة والمزامنة».</p><label>رمز المدير الجديد${secretInput('rp-p1')}</label><label>أعد كتابته${secretInput('rp-p2')}</label>`
          : d.pin ? `<label>رمز هذا الدور${secretInput('rp-p1')}</label>` : ''}
        <p id="rp-m" class="small"></p><div class="row"><button id="rp-ok">متابعة</button><button class="sec" id="rp-b">رجوع</button></div>`;
      q('#rp-b').onclick = home; (q('#rp-p1') || q('#rp-ok')).focus();
      q('#rp-ok').onclick = async () => {
        const center = q('#rp-c')?.value || '';
        if (!d.pin) return set(role, center);
        if (Date.now() < lockUntil) return msg(`محاولات كثيرة؛ انتظر ${Math.ceil((lockUntil - Date.now()) / 1000)} ثانية`);
        const p = q('#rp-p1').value;
        if (boot) { if (p.trim().length < PIN_MIN) return msg(`الرمز ${PIN_MIN} خانات على الأقل`); if (p !== q('#rp-p2').value) return msg('الرمزان غير متطابقين'); const v = await makeVerifier(p); const wrote = await savePins({ admin: v }); if (!wrote) C.toast('حُفظ الرمز على هذا الجهاز؛ سيُكتب في المجلد بعد اختيار المجلد ومزامنته'); return set(role, center, fpOf(v)); }
        if (await checkPin(p, vs[role])) { fails = 0; return set(role, center, fpOf(vs[role])); }
        if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; return msg('خمس محاولات خاطئة؛ انتظر 30 ثانية'); } msg('الرمز غير صحيح');
      };
    };
    wireEyes(w); w.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && q('#rp-ok')) { e.preventDefault(); q('#rp-ok').click(); } if (e.key === 'Escape' && cancelable) close(false); });
    home(); document.body.append(w);
  });
}
// الاختبارات الآلية (webdriver) تتخطى النافذة ما لم يُطلب العكس
export async function ensureRole() {
  if (!active() || load()) return;
  try { if (navigator.webdriver && !localStorage.getItem('nawa.testRoles')) return; } catch { /* */ }
  await pick({ cancelable: false });
}
// بعد كل مزامنة ناجحة: إن غيّر المدير رمز دوري العالي، يُطلب الرمز الجديد
export async function revalidate() {
  if (!active()) return; const r = load();
  if (r?.role === 'setup' && C.sync.handle && C.db.centers.length) { store(null); C.toast('تمت المزامنة؛ اختر دورك الآن'); if (await pick({ cancelable: false })) { C.nav(); C.go(C.route()); } return; }
  if (!r || !needsPin(r.role)) return;
  const vs = await getVerifiers(false), v = vs[r.role]; if (!v) return;
  if (r.fp && fpOf(v) !== r.fp) { store(null); C.toast('غُيّر رمز دورك؛ أعد اختيار الدور'); await pick({ cancelable: false }); C.nav(); C.go(C.route()); }
}
export const roleActions = () => ({
  async roleSwitch() { if (await pick({ cancelable: true })) { C.nav(); C.go(C.route()); } },
  async pinsSave() {
    const g = (id) => document.getElementById(id)?.value.trim() || ''; const part = {}, m = document.getElementById('pinmsg');
    try { for (const r of PIN_ROLES) { const p = g('pin_' + r); if (p) part[r] = await makeVerifier(p); } } catch (e) { return (m.textContent = e.message); }
    if (!Object.keys(part).length) return (m.textContent = 'اكتب رمزًا واحدًا على الأقل');
    const wrote = await savePins(part); m.textContent = wrote ? 'حُفظت الرموز في المجلد وستصل الأجهزة بعد المزامنة' : 'حُفظت على هذا الجهاز فقط؛ اختر مجلد المزامنة وفعّل صلاحيته ثم احفظ مجددًا'; PIN_ROLES.forEach((r) => { const i = document.getElementById('pin_' + r); if (i) i.value = ''; });
  },
});
export const pinsCard = () => !canPins() ? '' : `<div class="card"><h2>رموز الأدوار العليا</h2>
  <p class="small">لكل دور رمز مختلف (${PIN_MIN} خانات على الأقل). يختاره الموظف عند اختيار دوره على جهازه. اترك الحقل فارغًا ليبقى الرمز الحالي. الرمز لا يُحفظ نصًا، بل بصمة مملّحة في <code>core/roles.pin</code>. هذا يمنع الخطأ العادي، أما حماية البيانات فمن مشاركة OneDrive. إن نسيت رمز المدير: احذف الملف <code>core/roles.pin</code> من OneDrive ثم اختر دور المدير من جديد.</p>
  <div class="row">${PIN_ROLES.map((r) => `<label>${esc(DEV_ROLES[r].ar)}${secretInput('pin_' + r, { w: '140px' })}</label>`).join('')}<button data-act="pinsSave">حفظ الرموز</button></div><p id="pinmsg" class="small"></p></div>`;
