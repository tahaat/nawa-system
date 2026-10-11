// شاشة «الإنجاز التشغيلي»: تسجيل ما يُنجَز في الأنشطة التي لا حضور فيها (تدقيق، صيانة، مشتريات، أرشفة…) مع دليل تحقق إلزامي
import { validateEntry } from '../core/validate.js';
import { outputMonthly } from '../core/aggregate.js';
import { uid } from '../core/model.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx; const st = { act: '', center: '', date: '', qty: 1, ref: '', note: '' };
export function initOps(c) { ctx = c; }
export function vOps() {
  const p = ctx.project(); if (!p) return ctx.empty();
  const db = ctx.db, acts = p.activities.filter((a) => a.ops), today = new Date().toISOString().slice(0, 10);
  if (!acts.length) { ctx.view().innerHTML = `<div class="card"><h2>الإنجاز التشغيلي</h2><p>لا توجد أنشطة تشغيلية في هذا المشروع. لتعريف نشاط كتشغيلي (تدقيق، صيانة، مشتريات…) علّم خانة «تشغيلي» في جدول الأنشطة بشاشة المشاريع.</p></div>`; return; }
  if (!acts.some((a) => a.id === st.act)) st.act = acts[0].id; st.date ||= today;
  const mine = db.ops.filter((o) => o.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const counts = outputMonthly(p, db).filter((o) => o.ind.measure === 'count');
  ctx.view().innerHTML = `<div class="card"><h2>تسجيل إنجاز</h2><p class="small">كل سجل يُحتسب وحدة منفَّذة في خطة العمل، وتُجمع كمياته في مؤشرات «عدد منجز». المرجع (رقم وثيقة/فاتورة/تقرير) إلزامي ليسهل التحقق.</p>
  <div class="row"><label>النشاط *<select id="o-act">${acts.map((a) => `<option value="${a.id}" ${a.id === st.act ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
  <label>المركز / المبنى<select id="o-ctr"><option value=""></option>${ctx.myCenters().map((c) => `<option value="${c.id}" ${c.id === st.center ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label>التاريخ *<input id="o-date" type="date" value="${st.date}" max="${today}"></label><label>الكمية *<input id="o-qty" type="number" min="1" step="1" value="${st.qty}" style="width:90px"></label>
  <label>المرجع / دليل التحقق *<input id="o-ref" value="${esc(st.ref)}" style="width:240px" placeholder="رقم فاتورة، تقرير، محضر استلام…"></label>
  <label>ملاحظات<input id="o-note" value="${esc(st.note)}" style="width:220px"></label><button id="o-save">حفظ</button></div><div id="o-err" class="small" style="color:var(--err);margin-top:6px"></div></div>
  ${counts.length ? `<div class="card"><h2>مؤشرات العدد المنجز</h2><table><tr><th>المؤشر</th><th>المنجز</th><th>المستهدف</th><th>الإنجاز</th></tr>${counts.map((o) => { const done = o.months.reduce((a, m) => a + m.M, 0), tg = o.ind.target?.M; return `<tr><td>${esc(o.ind.name)}</td><td><b>${done}</b></td><td>${tg ?? '—'}</td><td>${tg ? Math.round((done / tg) * 100) + '%' : ''}</td></tr>`; }).join('')}</table></div>` : ''}
  <div class="card"><h2>سجل الإنجاز (${mine.length})</h2>${mine.length ? `<div class="tw"><table><tr><th>التاريخ</th><th>النشاط</th><th>المركز</th><th>الكمية</th><th>المرجع</th><th>ملاحظات</th><th></th></tr>${mine.map((o) => `<tr><td>${o.date}</td><td>${esc(p.activities.find((a) => a.id === o.activityId)?.name)}</td><td>${esc(db.centers.find((c) => c.id === o.centerId)?.name || '')}</td><td><b>${o.qty}</b></td><td>${esc(o.ref)}</td><td>${esc(o.note || '')}</td><td><button class="x" data-opdel="${o.id}">حذف</button></td></tr>`).join('')}</table></div>` : '<p class="small">لا سجلات بعد.</p>'}</div>`;
  const rd = () => Object.assign(st, { act: $('#o-act').value, center: $('#o-ctr').value, date: $('#o-date').value, qty: +$('#o-qty').value, ref: $('#o-ref').value.trim(), note: $('#o-note').value.trim() });
  ['o-act', 'o-ctr', 'o-date', 'o-qty', 'o-ref', 'o-note'].forEach((id) => ($('#' + id).onchange = rd));
  $('#o-save').onclick = () => { rd(); const o = { id: uid('op'), projectId: p.id, activityId: st.act, centerId: st.center || null, date: st.date, qty: st.qty, ref: st.ref, ...(st.note ? { note: st.note } : {}) };
    const er = validateEntry({ ...db, sessions: [], beneficiaries: [], sheets: [], surveyResponses: [], ops: [...db.ops, o] }).filter((i) => i.code.startsWith('T') && i.ref === o.id && i.level === 'error');
    if (er.length) { $('#o-err').textContent = er.map((i) => i.msg).join(' — '); return; }
    db.ops.push(o); st.ref = ''; st.note = ''; st.qty = 1; ctx.save(); ctx.toast('تم تسجيل الإنجاز'); vOps(); };
  document.querySelectorAll('[data-opdel]').forEach((b) => (b.onclick = async () => { if (!(await ctx.ask('حذف سجل الإنجاز؟'))) return; db.ops = db.ops.filter((x) => x.id !== b.dataset.opdel); ctx.save(); vOps(); }));
}
