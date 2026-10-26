// مؤشر استهلاك Cloudflare (للمدير فقط): حلقة نسبة في الشريط العلوي + لوحة تفصيل
let C, U = null, T;
export const initUsage = (c) => { C = c; };
const on = () => !!C.me()?.policy?.manageUsers && !!C.sync.cfg.token;
const fmtB = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const num = (n) => Number(n).toLocaleString('en');
const pctOf = (u) => Math.min(100, Math.round(Math.max(u.reqToday / u.limits.reqDay, u.dbBytes / u.limits.dbBytes) * 100));
const col = (p) => (p >= 85 ? '#c62828' : p >= 60 ? '#e6a901' : '#2e8b57');
const ring = (p, r = 9) => { const c = 2 * Math.PI * r; return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="3"/><circle cx="12" cy="12" r="${r}" fill="none" stroke="${col(p)}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 12 12)"/></svg>`; };
export const usageChip = () => { if (!on()) return ''; const p = U ? pctOf(U) : 0; return `<button class="sec ic usage" data-act="usage" title="${U ? `عرض حدود الاستخدام · ${p}% مستخدم` : 'عرض حدود الاستخدام'}" aria-label="حدود الاستخدام">${ring(p)}</button>`; };
export async function refreshUsage() {
  clearTimeout(T); if (!on()) return;
  try { U = await C.capi('/api/usage'); const b = document.querySelector('#top .usage'); if (b) { const p = pctOf(U); b.innerHTML = ring(p); b.title = `عرض حدود الاستخدام · ${p}% مستخدم`; } } catch (e) { console.warn('usage', e.message); }
  T = setTimeout(refreshUsage, 300000);
}
const bar = (label, used, limit, txt) => { const p = Math.min(100, Math.round(used / limit * 100)); return `<div class="ub"><div class="ubh"><span>${label}</span><b>${txt} <small>(${p}%)</small></b></div><div class="ubt"><i style="width:${Math.max(p, 1)}%;background:${col(p)}"></i></div></div>`; };
export const usageActions = () => ({
  async usage() {
    await refreshUsage(); if (!U) return C.toast('تعذّر تحميل الاستهلاك — تحقق من الاتصال');
    document.getElementById('usagecard')?.remove(); const mx = Math.max(1, ...U.last.map((r) => r.req)), p = pctOf(U);
    const w = document.createElement('div'); w.className = 'dlg-bg'; w.id = 'usagecard'; w.setAttribute('role', 'dialog');
    w.innerHTML = `<div class="dlg ucard"><h2>استهلاك السحابة (Cloudflare)</h2><div class="ubig">${ring(p, 9).replace('width="24" height="24"', 'width="64" height="64"')}<div><b>${p}%</b><small>أعلى نسبة بين الحدود أدناه</small></div></div>
    ${bar('طلبات اليوم', U.reqToday, U.limits.reqDay, `${num(U.reqToday)} / ${num(U.limits.reqDay)}`)}${bar('حجم قاعدة البيانات', U.dbBytes, U.limits.dbBytes, `${fmtB(U.dbBytes)} / ${fmtB(U.limits.dbBytes)}`)}
    <div class="ubh"><span>طلبات هذا الشهر</span><b>${num(U.reqMonth)}</b></div>
    <div class="uspark" title="طلبات آخر 14 يومًا">${U.last.map((r) => `<i style="height:${Math.max(4, Math.round(r.req / mx * 100))}%" title="${r.day}: ${num(r.req)}"></i>`).join('')}</div>
    <p class="small">الأرقام تقريبية (تُحسب من داخل النظام). الحدود المعروضة هي حدود الخطة المجانية الافتراضية وتُضبط من متغيرات Worker (<bdi dir="ltr">LIMIT_REQ_DAY</bdi>، <bdi dir="ltr">LIMIT_DB_BYTES</bdi>). للأرقام الرسمية: لوحة Cloudflare ← Workers &amp; Pages ← naseej ← Metrics، وD1 ← naseej.</p>
    <div class="row" style="justify-content:center"><button data-act="usageClose">إغلاق</button></div></div>`;
    w.addEventListener('click', (e) => { if (e.target === w) w.remove(); }); w.addEventListener('keydown', (e) => { if (e.key === 'Escape') w.remove(); });
    document.body.appendChild(w); w.querySelector('button').focus();
  },
  usageClose() { document.getElementById('usagecard')?.remove(); },
});
