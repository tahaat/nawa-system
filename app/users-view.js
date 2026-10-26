// المستخدمون والتكليفات والأجهزة وسجل التدقيق + تسجيل الدخول (يتطلب خادم المزامنة)
import { brandHtml } from './brand.js';
import { newMeta } from '../core/sync.js';
import { eyeIcon, wireEyes } from './devrole.js';
export const ROLE_AR = { admin: 'مدير النظام (IT)', meal: 'منسق/مسؤول المتابعة والتقييم', projects: 'مسؤول مشاريع', coordinator: 'منسق', facilitator: 'منشط / تربوي', entry: 'مدخل بيانات (المكتب)' };
const POL_ROLES = ['facilitator', 'coordinator', 'projects', 'entry', 'meal'];
const ACT_AR = { login: 'دخول', login_fail: 'محاولة دخول فاشلة', login_locked: 'حساب مقفل مؤقتًا', logout: 'خروج', add: 'إضافة سجل', edit: 'تعديل سجل', del: 'حذف سجل', push: 'مزامنة', add_user: 'إضافة مستخدم', edit_user: 'تعديل مستخدم', disable_user: 'تعطيل مستخدم', enable_user: 'تفعيل مستخدم', revoke_device: 'إلغاء جهاز', change_password: 'تغيير كلمة المرور', set_policy: 'تعديل الصلاحيات' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let C; const st = { au: null, rows: [], audUser: '' };
export const initUsers = (c) => { C = c; };

const asRow = (a, i) => `<tr><td><select data-as="${i}.project"><option value="">— كل المشاريع —</option>${C.db.projects.map((p) => `<option value="${esc(p.id)}" ${a.project === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></td>
  <td><select data-as="${i}.center"><option value="">— كل المراكز —</option>${C.db.centers.map((c) => `<option value="${esc(c.id)}" ${a.center === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></td>
  <td><input type="date" data-as="${i}.from" value="${esc(a.from || '')}"></td><td><input type="date" data-as="${i}.to" value="${esc(a.to || '')}"></td><td><button class="x" data-act="asDel" data-i="${i}" title="حذف التكليف">✕</button></td></tr>`;
const asTable = () => `<table><tr><th>المشروع</th><th>المركز</th><th>من</th><th>إلى</th><th></th></tr>${st.rows.map(asRow).join('')}</table><div class="row"><button class="sec" data-act="asAdd">+ تكليف</button></div>`;
const today = () => new Date().toISOString().slice(0, 10);
const asText = (a) => `${esc(C.db.projects.find((p) => p.id === a.project)?.name || 'كل المشاريع')} — ${esc(C.db.centers.find((c) => c.id === a.center)?.name || 'كل المراكز')}${a.from || a.to ? ` <span class="small">(${esc(a.from || '…')} ← ${esc(a.to || '…')})</span>` : ''}${a.to && a.to < today() ? ' <span class="badge b-error">منتهٍ</span>' : ''}`;

export async function vUsers() {
  const v = C.view(); v.innerHTML = '<div class="card">…</div>'; let us, pol, devs, aud;
  try { us = (await C.capi('/api/users')).users; pol = (await C.capi('/api/policy')).policy; devs = (await C.capi('/api/sessions')).sessions; aud = (await C.capi('/api/audit?limit=150' + (st.audUser ? '&user=' + encodeURIComponent(st.audUser) : ''))).rows; } catch (e) { v.innerHTML = `<div class="card">تعذّر التحميل: ${esc(e.message)}</div>`; return; }
  const routesAll = Object.entries(C.ROUTES).filter(([k]) => k !== 'users'), cur = us.find((u) => u.name === st.au);
  v.innerHTML = `<div class="card"><h2>المستخدمون</h2><div style="overflow:auto"><table><tr><th>المستخدم</th><th>الدور</th><th>التكليفات</th><th>الأجهزة</th><th>آخر دخول</th><th>الحالة</th><th></th></tr>${us.map((u) => `<tr><td>${u.label && u.label !== u.name.split('@')[0] ? `<b>${esc(u.label)}</b>${u.title ? `<div class="small">${esc(u.title)}</div>` : ''}<div class="small" dir="ltr" style="text-align:start">${esc(u.name)}</div>` : esc(u.name) + (u.title ? `<div class="small">${esc(u.title)}</div>` : '')}</td><td>${ROLE_AR[u.role] || u.role}</td><td>${u.assignments.length ? u.assignments.map((a) => `<div>${asText(a)}</div>`).join('') : '<span class="small">—</span>'}</td><td>${u.devices}</td><td class="small">${u.last_login ? new Date(u.last_login).toLocaleString('ar') : '—'}</td><td>${u.active ? '<span class="badge b-ok">فعّال</span>' : '<span class="badge b-error">معطّل</span>'}</td>
  <td style="white-space:nowrap"><button class="sec" data-act="uEdit" data-n="${esc(u.name)}">التكليفات</button> ${C.sync.cfg.access ? '' : `<button class="sec" data-act="uReset" data-n="${esc(u.name)}">كلمة مرور جديدة</button>`} ${u.name === C.me()?.name ? '' : `<button class="sec" data-act="uToggle" data-n="${esc(u.name)}" data-a="${u.active ? 0 : 1}">${u.active ? 'تعطيل' : 'تفعيل'}</button>`}</td></tr>`).join('')}</table></div><p id="utok"></p></div>
  ${cur ? `<div class="card"><h3>تكليفات «${esc(cur.name)}» (${ROLE_AR[cur.role] || cur.role})</h3><p class="small">المستخدم يرى ويكتب فقط ضمن مشروعه ومركزه وفترته. عند انتهاء الفترة ينقطع وصوله تلقائيًا؛ ولنقله لمشروع أو مركز آخر عدّل التكليف هنا دون حساب جديد. الدور «منسق» يعتمد المراكز، و«منشط» و«مسؤول مشاريع» يعتمدان المشروع والمركز.</p><div id="asedit">${asTable()}</div>
  <div class="row" style="margin-top:.5rem">${C.sync.cfg.access ? `<label>الاسم الكامل<input id="uelabel" value="${esc(cur.label || '')}" maxlength="60"></label><label>المسمى الوظيفي<input id="uetitle" value="${esc(cur.title || '')}" maxlength="80" placeholder="منسقة إدارية في قسم المتابعة والتقييم"></label>` : ''}<label>الدور<select id="uedrole">${Object.entries(ROLE_AR).map(([k, t]) => `<option value="${k}" ${cur.role === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><button data-act="asSave">حفظ</button><button class="sec" data-act="asClose">إغلاق</button></div></div>` : ''}
  <div class="card"><h3>إضافة مستخدم</h3><div class="row"><label>${C.sync.cfg.access ? "البريد الإلكتروني" : "الاسم"}<input id="un" ${C.sync.cfg.access ? 'type="email" dir="ltr" placeholder="name@nawaculture.org"' : ''}></label>${C.sync.cfg.access ? `<label>الاسم الكامل<input id="unl" maxlength="60" placeholder="حنين أبو سليم"></label><label>المسمى الوظيفي<input id="unt" maxlength="80" placeholder="منسقة إدارية في قسم المتابعة والتقييم"></label>` : ''}<label>الدور<select id="ur">${Object.entries(ROLE_AR).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label><button data-act="uAdd">إضافة</button></div>
  <p class="small">تُولَّد كلمة مرور مؤقتة تظهر مرة واحدة، ويُطلب من المستخدم تغييرها عند أول دخول. أضف التكليفات بعد الإنشاء من زر «التكليفات».</p></div>
  <div class="card"><h3>الأجهزة المسجّلة</h3>${devs.length ? `<table><tr><th>المستخدم</th><th>الجهاز</th><th>آخر نشاط</th><th></th></tr>${devs.map((d) => `<tr><td>${esc(d.user)}</td><td class="small">${esc(d.device)}</td><td class="small">${new Date(d.last).toLocaleString('ar')}</td><td><button class="sec" data-act="devRevoke" data-id="${esc(d.id)}" data-u="${esc(d.user)}">إلغاء الجهاز</button></td></tr>`).join('')}</table>` : '<p class="small">لا أجهزة نشطة.</p>'}<p class="small">إلغاء الجهاز يُخرج صاحبه فورًا ويطلب منه الدخول من جديد (مفيد عند فقدان هاتف).</p></div>
  <div class="card"><h3>سجل التدقيق</h3><div class="row"><label>المستخدم<select id="audu"><option value="">الكل</option>${us.map((u) => `<option ${st.audUser === u.name ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label></div><div style="overflow:auto;max-height:340px"><table><tr><th>الوقت</th><th>المستخدم</th><th>الحدث</th><th>التفاصيل</th></tr>${aud.map((r) => `<tr><td class="small">${new Date(r.at).toLocaleString('ar')}</td><td>${esc(r.user)}</td><td>${ACT_AR[r.action] || esc(r.action)}</td><td class="small" dir="ltr" style="text-align:start">${esc(r.detail)}</td></tr>`).join('')}</table></div></div>
  <div class="card"><h2>صلاحيات الأدوار</h2><p class="small">تُفرض على الخادم. «مراكزه فقط» أو «مشاريعه وتكليفاته فقط» تعني أن المستخدم يرى ويكتب سجلات نطاقه فقط. الحقول المخفية لا تصل جهازه أصلًا وتبقى محفوظة كما هي عند تعديله للسجل.</p>
  ${POL_ROLES.map((r) => { const p = pol[r]; return `<h3>${ROLE_AR[r]}</h3><div class="row">
    <label>الجلسات<select data-pol="${r}|sessions">${[['all', 'كل المراكز'], ['own', 'مراكزه فقط'], ['proj', 'مشاريعه وتكليفاته فقط']].map(([x, t]) => `<option value="${x}" ${p.read.sessions === x ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>الشاشات<span class="row">${routesAll.map(([k, [t]]) => `<label style="flex-direction:row;align-items:center;color:inherit"><input type="checkbox" data-polr="${r}|${k}" ${p.routes === '*' || p.routes.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</span></label></div>
    <div class="row"><span class="small">إخفاء من بيانات المستفيد (الجنس والعمر وكون المستفيد من ذوي الإعاقة لا تُخفى لأن الحسابات تعتمد عليها):</span>${['phone', 'disabilityType'].map((f) => `<label style="flex-direction:row;align-items:center;color:inherit"><input type="checkbox" data-polh="${r}|${f}" ${(p.hidden?.beneficiaries || []).includes(f) ? 'checked' : ''}> ${{ phone: 'الهاتف', disabilityType: 'نوع الإعاقة' }[f]}</label>`).join('')}</div>`; }).join('')}
  <div class="row" style="margin-top:12px"><button data-act="polSave">حفظ الصلاحيات</button></div><p id="pmsg"></p></div>`;
  window.__pol = pol; window.__users = us;
}

export function wireUsers() {
  document.addEventListener('change', (e) => {
    const t = e.target, d = t.dataset || {}, P = window.__pol;
    if (d.as) { const [i, f] = d.as.split('.'); if (st.rows[+i]) st.rows[+i][f] = t.value; return; }
    if (t.id === 'audu') { st.audUser = t.value; vUsers(); return; }
    if (!P || !t.closest?.('#view')) return;
    if (d.pol) { const [r, c] = d.pol.split('|'); P[r].read[c] = t.value; for (const k of ['sheets', 'ops', 'surveyResponses']) if (P[r].read[k] && ['all', 'own', 'proj'].includes(P[r].read[k])) P[r].read[k] = t.value; if (P[r].write[c]) P[r].write[c] = t.value; }
    if (d.polr) { const [r, k] = d.polr.split('|'); const cur = P[r].routes === '*' ? Object.keys(C.ROUTES).filter((x) => x !== 'users') : P[r].routes; P[r].routes = t.checked ? [...new Set([...cur, k])] : cur.filter((x) => x !== k); }
    if (d.polh) { const [r, f] = d.polh.split('|'); const h = (P[r].hidden ||= {}); const a = new Set(h.beneficiaries || []); t.checked ? a.add(f) : a.delete(f); h.beneficiaries = [...a]; }
  });
}
const showPw = (name, pw) => { const e = $('#utok'); if (e) e.innerHTML = `<span class="badge b-ok">تم</span> كلمة المرور المؤقتة لـ <b>${esc(name)}</b> (تظهر مرة واحدة، سلّمها له بشكل آمن): <code dir="ltr">${esc(pw)}</code>`; };
export const usersActions = () => ({
  async uAdd() { const name = $('#un').value.trim(); if (!name) return C.toast('الاسم مطلوب'); try { const r = await C.capi('/api/users', 'POST', { name, role: $('#ur').value, label: $('#unl')?.value.trim() || undefined, title: $('#unt')?.value.trim() || undefined }); st.au = name; st.rows = []; await vUsers(); if (r.password) showPw(name, r.password); else C.toast('أُضيف المستخدم — يدخل ببريده عبر بوابة Cloudflare Access'); } catch (e) { C.toast(/409/.test(e.message) ? 'الاسم مستعمل' : e.message); } },
  async uToggle(t) { await C.capi('/api/users/disable', 'POST', { name: t.dataset.n, active: t.dataset.a === '1' }); vUsers(); },
  async uReset(t) { if (!(await C.ask(`إنشاء كلمة مرور جديدة لـ «${t.dataset.n}»؟ سيُخرَج من كل أجهزته.`))) return; const r = await C.capi('/api/users', 'PUT', { name: t.dataset.n, resetPassword: true }); showPw(t.dataset.n, r.password); },
  uEdit(t) { st.au = t.dataset.n; st.rows = JSON.parse(JSON.stringify((window.__users || []).find((u) => u.name === st.au)?.assignments || [])); vUsers(); },
  asAdd() { st.rows.push({ project: C.db.projects[0]?.id || '', center: '', from: '', to: '' }); $('#asedit').innerHTML = asTable(); },
  asDel(t) { st.rows.splice(+t.dataset.i, 1); $('#asedit').innerHTML = asTable(); },
  async asSave() { await C.capi('/api/users', 'PUT', { name: st.au, role: $('#uedrole').value, label: $('#uelabel')?.value.trim() || undefined, title: $('#uetitle') ? $('#uetitle').value.trim() : undefined, assignments: st.rows.filter((r) => r.project || r.center) }); C.toast('حُفظت التكليفات'); vUsers(); },
  asClose() { st.au = null; vUsers(); },
  async devRevoke(t) { await C.capi('/api/sessions/revoke', 'POST', { id: t.dataset.id, user: t.dataset.u }); vUsers(); },
  async polSave() { await C.capi('/api/policy', 'PUT', { policy: window.__pol }); $('#pmsg').innerHTML = '<span class="badge b-ok">حُفظت</span>'; },
});

// ===== تسجيل الدخول =====
export async function loginCall(url, name, password) {
  const r = await fetch(url.replace(/\/$/, '') + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, password, device: (navigator.userAgentData?.platform || navigator.platform || '') + ' · ' + (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)?.[0] || '') }) });
  const j = await r.json().catch(() => ({})); if (r.status === 429) throw new Error('الحساب مقفل مؤقتًا بسبب محاولات خاطئة، حاول بعد ' + Math.ceil((j.retryAfter || 600) / 60) + ' دقائق'); if (!r.ok) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة'); return j;
}
export function showLogin({ onDone, msg = '' }) {
  document.getElementById('login')?.remove(); const d = document.createElement('div'); d.id = 'login';
  d.innerHTML = `<form class="card"><img class="logo" alt="نوى" src="${document.querySelector('.logo')?.src || ''}" style="height:64px;margin:0 auto .6rem;display:block">${brandHtml()}<h2 style="text-align:center">تسجيل الدخول</h2><label>اسم المستخدم<input id="lgn" autocomplete="username" required></label><label>كلمة المرور<span class="pw"><input id="lgp" type="password" autocomplete="current-password" required><button type="button" class="eye" data-eye="lgp" aria-label="إظهار/إخفاء" title="إظهار/إخفاء">${eyeIcon()}</button></span></label><button type="submit">دخول</button><p id="lgm" class="small" role="alert">${esc(msg)}</p></form>`;
  document.body.append(d); wireEyes(d); $('#lgn', d).focus();
  $('form', d).onsubmit = async (e) => { e.preventDefault(); const m = $('#lgm', d); m.textContent = '…'; try { const j = await loginCall(C.sync.cfg.url, $('#lgn', d).value.trim(), $('#lgp', d).value); C.sync.cfg.token = j.token; C.sync.cfg.user = j.name; C.save(); if (j.mustChange) { await forceChange($('#lgp', d).value, d); } d.remove(); await onDone?.(); } catch (er) { m.textContent = er.message; } };
}
async function forceChange(old, d) {
  const f = d.querySelector('form'); wireEyes(d); f.innerHTML = '<h2>تغيير كلمة المرور</h2><p class="small">كلمة المرور الحالية مؤقتة. اختر كلمة مرور جديدة (8 أحرف على الأقل).</p><label>كلمة المرور الجديدة<span class="pw"><input id="np1" type="password" autocomplete="new-password"><button type="button" class="eye" data-eye="np1" aria-label="إظهار/إخفاء">' + eyeIcon() + '</button></span></label><label>تأكيد<span class="pw"><input id="np2" type="password" autocomplete="new-password"><button type="button" class="eye" data-eye="np2" aria-label="إظهار/إخفاء">' + eyeIcon() + '</button></span></label><button type="submit">حفظ</button><p id="lgm" class="small"></p>';
  await new Promise((res) => { f.onsubmit = async (e) => { e.preventDefault(); const a = $('#np1', f).value, b = $('#np2', f).value, m = $('#lgm', f); if (a.length < 8) return (m.textContent = 'كلمة المرور قصيرة'); if (a !== b) return (m.textContent = 'غير متطابقتين'); try { await C.capi('/api/password', 'POST', { old, new: a }); res(); } catch { m.textContent = 'تعذّر الحفظ'; } }; });
}
export const wipeLocal = () => { for (const k of Object.keys(C.db)) C.db[k] = []; C.sync.meta = newMeta(); C.sync.cfg.me = null; };
