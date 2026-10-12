// شاشة «الإنجاز التشغيلي»: تسجيل ما يُنجَز في الأنشطة التي لا حضور فيها (تدقيق، صيانة، مشتريات، أرشفة…) مع دليل تحقق إلزامي
import { validateEntry } from '../core/validate.js';
import { outputMonthly } from '../core/aggregate.js';
import { uid } from '../core/model.js';
import { pager } from './pager.js';
import { putDraft, delDraft, draftsCard, newDraftId } from './drafts.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx; const st = { act: '', center: '', date: '', qty: 1, ref: '', note: '' };
export function initOps(c) { ctx = c; }
const dirty = () => !st.editId && !!(st.ref || st.note || st.qty !== 1);
const reset = () => Object.assign(st, { ref: '', note: '', qty: 1, draftId: null });
export function opsAuto(clear = false) {
  if ($('#o-ref')) st.rd?.(); if (!st.pid || !dirty()) return false;
  const a = ctx.db.projects.find((x) => x.id === st.pid)?.activities.find((x) => x.id === st.act); st.draftId ||= newDraftId('op');
  putDraft({ id: st.draftId, type: 'op', projectId: st.pid, title: `إنجاز${a ? ' — ' + a.name : ''}${st.date ? ' — ' + st.date : ''}${st.ref ? ' — ' + st.ref : ''}`, data: { act: st.act, center: st.center, date: st.date, qty: st.qty, ref: st.ref, note: st.note } });
  if (clear) reset(); return true;
}
export function restoreOp(d, id) { Object.assign(st, { act: d.act, center: d.center || '', date: d.date, qty: d.qty, ref: d.ref || '', note: d.note || '', editId: null, draftId: id }); }
export function openOp(id) { const o = ctx.db.ops.find((x) => x.id === id); if (!o) return false; Object.assign(st, { act: o.activityId, center: o.centerId || '', date: o.date, qty: o.qty, ref: o.ref || '', note: o.note || '', editId: id }); vOps(); scrollTo({ top: 0 }); return true; }
export function vOps() {
  const p = ctx.project(); if (!p) return ctx.empty();
  st.pid = p.id; const db = ctx.db, acts = p.activities.filter((a) => a.ops), today = new Date().toISOString().slice(0, 10);
  if (!acts.length) { ctx.view().innerHTML = `<div class="card"><h2>الإنجاز التشغيلي</h2><p>لا توجد أنشطة تشغيلية في هذا المشروع. لتعريف نشاط كتشغيلي (تدقيق، صيانة، مشتريات…) علّم خانة «تشغيلي» في جدول الأنشطة بشاشة المشاريع.</p></div>`; return; }
  if (!acts.some((a) => a.id === st.act)) st.act = acts[0].id; st.date ||= today;
  const mine = db.ops.filter((o) => o.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date)), OP = pager('ops-' + p.id, mine.length, vOps);
  const counts = outputMonthly(p, db).filter((o) => o.ind.measure === 'count');
  ctx.view().innerHTML = (st.editId ? '' : draftsCard(p.id, 'op')) + `<div class="card"><div class="row-h"><h2>${st.editId ? 'تعديل سجل إنجاز' : 'تسجيل إنجاز'}</h2>${st.editId ? '' : '<button class="sec" id="o-draft" title="احفظ ما كتبته كمسودة وأكمله لاحقًا">حفظ كمسودة</button>'}</div><p class="small">كل سجل يُحتسب وحدة منفَّذة في خطة العمل، وتُجمع كمياته في مؤشرات «عدد منجز». المرجع (رقم وثيقة/فاتورة/تقرير) إلزامي ليسهل التحقق.</p>
  <div class="row"><label>النشاط *<select id="o-act">${acts.map((a) => `<option value="${a.id}" ${a.id === st.act ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
  <label>المركز / المبنى<select id="o-ctr"><option value=""></option>${ctx.myCenters().map((c) => `<option value="${c.id}" ${c.id === st.center ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label>التاريخ *<input id="o-date" type="date" value="${st.date}" max="${today}"></label><label>الكمية *<input id="o-qty" type="number" min="1" step="1" value="${st.qty}" style="width:90px"></label>
  <label>المرجع / دليل التحقق *<input id="o-ref" value="${esc(st.ref)}" style="width:240px" placeholder="رقم فاتورة، تقرير، محضر استلام…"></label>
  <label>ملاحظات<input id="o-note" value="${esc(st.note)}" style="width:220px"></label><button id="o-save">${st.editId ? 'حفظ التعديل' : 'حفظ'}</button>${st.editId ? '<button class="sec" id="o-cancel">إلغاء التعديل</button>' : ''}</div><div id="o-err" class="small" style="color:var(--err);margin-top:6px"></div></div>
  ${counts.length ? `<div class="card"><h2>مؤشرات العدد المنجز</h2><table><tr><th>المؤشر</th><th>المنجز</th><th>المستهدف</th><th>الإنجاز</th></tr>${counts.map((o) => { const done = o.months.reduce((a, m) => a + m.M, 0), tg = o.ind.target?.M; return `<tr><td>${esc(o.ind.name)}</td><td><b>${done}</b></td><td>${tg ?? '—'}</td><td>${tg ? Math.round((done / tg) * 100) + '%' : ''}</td></tr>`; }).join('')}</table></div>` : ''}
  <div class="card"><h2>سجل الإنجاز (${mine.length})</h2>${mine.length ? `${OP.html()}<div class="tw"><table><tr><th>التاريخ</th><th>النشاط</th><th>المركز</th><th>الكمية</th><th>المرجع</th><th>ملاحظات</th><th></th></tr>${OP.slice(mine).map((o) => `<tr><td>${o.date}</td><td>${esc(p.activities.find((a) => a.id === o.activityId)?.name)}</td><td>${esc(db.centers.find((c) => c.id === o.centerId)?.name || '')}</td><td><b>${o.qty}</b></td><td>${esc(o.ref)}</td><td>${esc(o.note || '')}</td><td><button class="sec" data-opedit="${o.id}">تعديل</button> <button class="x" data-opdel="${o.id}">حذف</button></td></tr>`).join('')}</table></div>${OP.html()}` : '<p class="small">لا سجلات بعد.</p>'}</div>`;
  const rd = () => Object.assign(st, { act: $('#o-act').value, center: $('#o-ctr').value, date: $('#o-date').value, qty: +$('#o-qty').value, ref: $('#o-ref').value.trim(), note: $('#o-note').value.trim() });
  st.rd = rd;
  const od = $('#o-draft'); if (od) od.onclick = () => { rd(); if (!dirty()) return ctx.toast('اكتب المرجع أو الملاحظة أو غيّر الكمية أولاً'); opsAuto(true); ctx.toast('حُفظ كمسودة'); vOps(); };
  ['o-act', 'o-ctr', 'o-date', 'o-qty', 'o-ref', 'o-note'].forEach((id) => ($('#' + id).onchange = rd));
  $('#o-save').onclick = () => { rd(); const o = { id: st.editId || uid('op'), projectId: p.id, activityId: st.act, centerId: st.center || null, date: st.date, qty: st.qty, ref: st.ref, ...(st.note ? { note: st.note } : {}) };
    const er = validateEntry({ ...db, sessions: [], beneficiaries: [], sheets: [], surveyResponses: [], ops: [...db.ops.filter((x) => x.id !== o.id), o] }).filter((i) => i.code.startsWith('T') && i.ref === o.id && i.level === 'error');
    if (er.length) { $('#o-err').textContent = er.map((i) => i.msg).join(' — '); return; }
    const ix = db.ops.findIndex((x) => x.id === o.id); if (ix >= 0) db.ops[ix] = o; else db.ops.push(o); const was = st.editId; if (st.draftId) delDraft(st.draftId); st.draftId = null; st.editId = null; st.ref = ''; st.note = ''; st.qty = 1; ctx.save(); ctx.toast(was ? 'تم حفظ التعديل' : 'تم تسجيل الإنجاز'); vOps(); window.dispatchEvent(new CustomEvent('nawa:saved')); };
  const oc = $('#o-cancel'); if (oc) oc.onclick = () => { st.editId = null; st.ref = ''; st.note = ''; st.qty = 1; vOps(); };
  document.querySelectorAll('[data-opedit]').forEach((b) => (b.onclick = () => openOp(b.dataset.opedit)));
  document.querySelectorAll('[data-opdel]').forEach((b) => (b.onclick = async () => { if (!(await ctx.ask('حذف سجل الإنجاز؟'))) return; db.ops = db.ops.filter((x) => x.id !== b.dataset.opdel); ctx.save(); vOps(); }));
}
