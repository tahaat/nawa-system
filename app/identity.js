// هوية صاحب الحساب: الاسم + المسمى الوظيفي + الدور، وبطاقة تعريف بشكل صفحة دخول مع تسجيل الخروج
import { brandHtml } from './brand.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'nawa.devprofile';
let C;
export const initIdentity = (c) => { C = c; };
const dprof = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const setProf = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* خاص */ } };
const initials = (n) => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] || '') + (w.length > 1 ? w[1][0] : '')).toUpperCase() || '؟'; };

export function identity() {
  const m = C?.me(); if (!m) return null;
  const cloud = !!C.sync.cfg.me, access = !!C.sync.cfg.access, p = dprof();
  const roleLabel = C.ROLE_AR[m.role] || C.DEV_ROLES?.[m.role]?.ar || m.role || '';
  const name = cloud ? (m.label || m.name || m.email || '') : (p.name || roleLabel);
  const title = cloud ? (m.title || '') : (p.title || '');
  const centers = (m.centers || []).map((id) => C.db.centers.find((c) => c.id === id)?.name).filter(Boolean);
  const asg = (m.assignments || []).map((a) => `${C.db.projects.find((x) => x.id === a.project)?.name || ''}${a.center ? ' — ' + (C.db.centers.find((x) => x.id === a.center)?.name || '') : ''}`.replace(/^ — /, '')).filter(Boolean);
  return { cloud, access, name, title, email: cloud ? (m.email || '') : '', roleLabel, centers, asg, hasName: cloud ? !!(m.label || m.name) : !!p.name };
}

export const idChip = () => { const i = identity(); if (!i) return ''; return `<button class="idchip" data-act="profile" title="${esc(i.name)} — ${esc(i.title || i.roleLabel)}" aria-label="${esc(i.name)}"><span class="av">${esc(initials(i.name))}</span><span class="idtx"><b>${esc(i.name)}</b><small>${esc(i.title || i.roleLabel)}</small></span></button>`; };

export function renderWho() {
  const e = document.getElementById('whoami'); if (!e) return; const i = identity();
  if (!i) { e.innerHTML = ''; e.hidden = true; return; }
  e.hidden = false;
  e.innerHTML = `<button class="who-in" data-act="profile" title="حسابي"><span class="av">${esc(initials(i.name))}</span><span class="idtx"><b>${esc(i.name)}</b><small>${esc(i.title || i.roleLabel)}</small>${i.title ? `<small class="rl">${esc(i.roleLabel)}</small>` : ''}</span></button><button class="who-out" data-act="logout" title="تسجيل الخروج" aria-label="تسجيل الخروج"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg></button>`;
}

function openProfile() {
  const i = identity(); if (!i) return; document.getElementById('idcard')?.remove();
  const w = document.createElement('div'); w.className = 'dlg-bg'; w.id = 'idcard'; w.setAttribute('role', 'dialog');
  const row = (k, v) => v ? `<div class="idrow"><span>${k}</span><b>${v}</b></div>` : '';
  w.innerHTML = `<div class="dlg idcard"><img class="idlogo" alt="" src="${document.querySelector('.logo')?.src || ''}">${brandHtml()}
  <div class="av big">${esc(initials(i.name))}</div>
  <h2>${esc(i.name)}</h2>${i.title ? `<p class="idtitle">${esc(i.title)}</p>` : ''}<span class="badge b-ok">${esc(i.roleLabel)}</span>
  <div class="idrows">${row('البريد', i.email ? `<bdi dir="ltr">${esc(i.email)}</bdi>` : '')}${row('المراكز', i.centers.map(esc).join('، '))}${row('التكليفات', i.asg.map(esc).join('<br>'))}</div>
  ${i.cloud ? '' : `<div class="idedit"><label>الاسم الكامل<input id="idn" value="${esc(dprof().name || '')}" maxlength="60" placeholder="حنين أبو سليم"></label><label>المسمى الوظيفي<input id="idt" value="${esc(dprof().title || '')}" maxlength="80" placeholder="منسقة إدارية في قسم المتابعة والتقييم"></label><p class="small">يُحفظ على هذا الجهاز فقط ويُعرض في الواجهة.</p></div>`}
  <div class="row idbtns">${i.cloud ? '' : '<button data-act="profileSave">حفظ الاسم</button>'}<button data-act="logout">${i.cloud ? 'تسجيل الخروج' : 'تبديل الدور / خروج'}</button><button class="sec" data-act="profileClose">إغلاق</button></div></div>`;
  w.addEventListener('keydown', (e) => { if (e.key === 'Escape') w.remove(); });
  w.addEventListener('click', (e) => { if (e.target === w) w.remove(); });
  document.body.appendChild(w); w.querySelector('.idbtns button')?.focus();
}

export const identityActions = () => ({
  profile() { openProfile(); },
  profileClose() { document.getElementById('idcard')?.remove(); },
  profileSave() { setProf({ name: document.getElementById('idn')?.value.trim() || '', title: document.getElementById('idt')?.value.trim() || '' }); document.getElementById('idcard')?.remove(); C.nav(); C.toast('حُفظ'); },
  async logout() {
    const i = identity(); document.getElementById('idcard')?.remove(); if (!i) return;
    if (!i.cloud) return C.actions.roleSwitch();
    if (C.pending() && !(await C.ask('توجد تغييرات لم تُرفع بعد. اتصل بالإنترنت وزامن أولًا، أو تابع الخروج وستبقى على الجهاز. متابعة الخروج؟'))) return;
    if (i.access) { location.href = '/cdn-cgi/access/logout'; return; }
    return C.actions.cloudLogout();
  },
});
