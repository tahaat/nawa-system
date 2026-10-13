// الفريق وخطة مشاركة المجلدات (وضع OneDrive): من يعمل على النظام، دوره ومركزه، وأي مجلدات تُشارَك معه.
// تُحفظ على جهاز المدير فقط (kv) ولا تدخل في المزامنة، لأنها تحوي بريدًا.
import ExcelJS from 'exceljs';
import { kvGet, kvSet } from './store.js';
import { SHARE_RULES, roleFrom, sharePlan, ACC_AR, folderOf } from '../core/share.js';
const ROLE_AR = { admin: 'مدير النظام (IT)', meal: 'منسق/مسؤول المتابعة والتقييم', projects: 'مسؤول مشاريع', coordinator: 'منسق', facilitator: 'منشط / تربوي', entry: 'مدخل بيانات (المكتب)' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let C, team = [], loaded = false;
export const initTeam = (c) => { C = c; };
export async function loadTeam() { if (!loaded) { team = (await kvGet('team')) || []; loaded = true; } return team; }
const persist = () => kvSet('team', team);
const emailOk = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const cname = (id) => C.db.centers.find((c) => c.id === id)?.name || '';

export function teamCard() {
  const cs = C.db.centers;
  const map = `<div class="card"><h2>مجلدات المراكز (اسم المركز ↔ اسم المجلد)</h2><p class="small">المجلد الذي تشاركه لكل مركز يحمل رمزًا؛ هذا الجدول يوضح أي مجلد لأي مركز.</p>
  <div class="tw"><table><tr><th>المركز</th><th>اسم المجلد في OneDrive</th><th></th></tr>${cs.map((c) => `<tr><td>${esc(c.name)}</td><td dir="ltr"><code>${esc(folderOf(c))}</code></td><td><button class="sec" data-act="tmCopy" data-t="${esc(folderOf(c))}">نسخ</button></td></tr>`).join('') || '<tr><td colspan="3">لا مراكز</td></tr>'}</table></div></div>`;
  const rows = team.map((p) => { const pl = sharePlan(p, cs);
    return `<tr><td>${esc(p.name)}</td><td dir="ltr">${esc(p.email || '')}</td><td>${esc(ROLE_AR[p.role] || '؟ غير محدد')}</td><td>${esc(cname(p.center) || (SHARE_RULES[p.role]?.centers === 'all' ? 'كل المراكز' : '—'))}</td>
    <td class="small">${pl.map((x) => x.access ? `<div><code dir="ltr">${esc(x.folder)}</code> — ${ACC_AR[x.access]}</div>` : `<div><span class="badge b-warn">${esc(x.note || x.label)}</span></div>`).join('') || '<span class="badge b-warn">حدّد الدور</span>'}</td>
    <td><button class="sec" data-act="tmDel" data-id="${esc(p.id)}">حذف</button></td></tr>`; }).join('');
  const form = `<div class="row"><label>الاسم<input id="tmn"></label><label>البريد (حساب Microsoft)<input id="tme" dir="ltr" type="email" style="width:240px"></label>
  <label>الدور<select id="tmr"><option value="">— اختر —</option>${Object.entries(ROLE_AR).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
  <label>المركز<select id="tmc"><option value="">— (لأدوار كل المراكز) —</option>${cs.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
  <button data-act="tmAdd">+ إضافة</button></div>`;
  return map + `<div class="card"><h2>الفريق المخوَّل بالعمل على النظام</h2>
  <p class="small">أضف كل شخص بدوره ومركزه، فيظهر أي مجلدات تُشارَك معه. لا يُرسل شيء من هنا: تُنفَّذ المشاركة من OneDrive نفسه (زر أيمن على المجلد ← مشاركة ← أدخل البريد ← «يمكنه التحرير» أو «يمكنه العرض»). هذه القائمة محفوظة على هذا الجهاز فقط.</p>
  ${form}
  <div class="row" style="margin:8px 0"><label>استيراد من Excel<input type="file" id="tmf" accept=".xlsx"></label><button class="sec" data-act="tmImp">استيراد</button><button class="sec" data-act="tmTpl">قالب الاستيراد</button><button class="sec" data-act="tmExp" ${team.length ? '' : 'disabled'}>تصدير خطة المشاركة (Excel)</button></div><p id="tmmsg" class="small"></p>
  <div class="tw"><table><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>المركز</th><th>المجلدات التي تُشارَك معه</th><th></th></tr>${rows || '<tr><td colspan="6">لا أحد بعد</td></tr>'}</table></div></div>`;
}

const toBuf = async (wb) => new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
export const teamActions = () => ({
  tmCopy(t) { navigator.clipboard?.writeText(t.dataset.t).then(() => C.toast('نُسخ: ' + t.dataset.t), () => C.toast(t.dataset.t)); },
  async tmAdd() {
    const name = $('#tmn').value.trim(), email = $('#tme').value.trim().toLowerCase(), role = $('#tmr').value, center = $('#tmc').value;
    if (!name) return C.toast('الاسم مطلوب'); if (!role) return C.toast('اختر الدور'); if (!emailOk(email)) return C.toast('البريد غير صحيح');
    if (SHARE_RULES[role].centers === 'own' && !center) return C.toast('هذا الدور يحتاج تحديد المركز');
    team.push({ id: 'tm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, email, role, center: SHARE_RULES[role].centers === 'own' ? center : '' });
    await persist(); C.rerender();
  },
  async tmDel(t) { team = team.filter((p) => p.id !== t.dataset.id); await persist(); C.rerender(); },
  async tmTpl() {
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('الفريق', { views: [{ rightToLeft: true }] });
    ws.addRow(['الاسم', 'البريد', 'الدور', 'المركز']); ws.addRow(['مثال: سناء أحمد', 'sana@example.org', 'منشط / تربوي', C.db.centers[0]?.name || '']);
    ws.getColumn(1).width = 28; ws.getColumn(2).width = 32; ws.getColumn(3).width = 34; ws.getColumn(4).width = 30; ws.getRow(1).font = { bold: true };
    const rs = wb.addWorksheet('الأدوار'); rs.addRow(['الأدوار المقبولة']); Object.values(ROLE_AR).forEach((r) => rs.addRow([r])); rs.getColumn(1).width = 40;
    await C.dl(await toBuf(wb), 'قالب-الفريق.xlsx');
  },
  async tmImp() {
    const f = $('#tmf').files[0]; if (!f) return C.toast('اختر ملفًا'); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.worksheets[0];
    let add = 0; const bad = [];
    ws.eachRow((r, i) => {
      if (i === 1) return; const g = (c) => String(r.getCell(c).text ?? r.getCell(c).value ?? '').trim(); const name = g(1), email = g(2).toLowerCase(), role = roleFrom(g(3)), cn = g(4);
      if (!name) return; const c = C.db.centers.find((x) => cn && (x.name === cn || x.name.includes(cn) || cn.includes(x.name)));
      if (!role) return bad.push(`${name}: الدور غير مفهوم`); if (!emailOk(email)) return bad.push(`${name}: بريد غير صحيح`); if (SHARE_RULES[role].centers === 'own' && !c) return bad.push(`${name}: المركز غير موجود (${cn || 'فارغ'})`);
      const ex = team.find((p) => email && p.email === email); const rec = { name, email, role, center: SHARE_RULES[role].centers === 'own' ? c.id : '' };
      if (ex) Object.assign(ex, rec); else { team.push({ id: 'tm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...rec }); add++; }
    });
    await persist(); C.rerender(); setTimeout(() => { const m = $('#tmmsg'); if (m) m.textContent = `أُضيف ${add} · تعذّر ${bad.length}${bad.length ? ' — ' + bad.join('؛ ') : ''}`; }, 50);
  },
  async tmExp() {
    const wb = new ExcelJS.Workbook(), a = wb.addWorksheet('خطة المشاركة', { views: [{ rightToLeft: true }] }), b = wb.addWorksheet('مجلدات المراكز', { views: [{ rightToLeft: true }] });
    a.addRow(['الاسم', 'البريد', 'الدور', 'المجلد', 'الصلاحية في OneDrive']); a.getRow(1).font = { bold: true };
    for (const p of team) for (const x of sharePlan(p, C.db.centers)) if (x.access) a.addRow([p.name, p.email, ROLE_AR[p.role], x.folder, ACC_AR[x.access]]);
    [24, 30, 30, 26, 22].forEach((w, i) => (a.getColumn(i + 1).width = w));
    b.addRow(['المركز', 'اسم المجلد']); b.getRow(1).font = { bold: true }; C.db.centers.forEach((c) => b.addRow([c.name, folderOf(c)])); b.getColumn(1).width = 34; b.getColumn(2).width = 30;
    await C.dl(await toBuf(wb), 'خطة-مشاركة-المجلدات.xlsx');
  },
});
