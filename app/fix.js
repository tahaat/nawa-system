// معالجة ملاحظات التحقق: كل ملاحظة تقود إلى السجل المعنيّ مباشرة، وقائمة معالجة تمرّ بك عليها واحدة واحدة وتعيد الفحص بعد كل تعديل
import { validateEntry, reconcile } from '../core/validate.js';
import { openBnf } from './bnf-view.js';
import { openSheet } from './sheets-view.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let ctx, q = null; // q = { items, i }
export const initFix = (c) => { ctx = c; window.addEventListener('nawa:saved', () => { if (q) render(); }); const v = document.querySelector('#view'); if (v) new MutationObserver(() => { if (q && ctx.route() !== 'check' && !v.querySelector('#fixbar')) render(); }).observe(v, { childList: true }); };

// ما الذي يجب فعله لكل رمز
export const HOW = {
  P01: 'حدّد تاريخ البداية والنهاية في «بيانات المشروع».', P02: 'اربط النشاط ببند في «تفصيل المستفيدين» من جدول الأنشطة.', P03: 'اربط مؤشر المخرجات بنشاط واحد على الأقل أو احذفه.',
  B01: 'أدخل العمر أو تاريخ الميلاد.', B02: 'أكمل الاسم (اسم رباعي).', B03: 'صحّح رقم الجوال: 10 أرقام تبدأ بـ 059 أو 056.', B04: 'حدّد الجنس.', B05: 'راجع السجلات المتشابهة؛ احذف المكرر أو عدّل الاسم.', B08: 'اختر نوع الإعاقة.',
  S00: 'اربط الجلسة بمشروع أو احذفها.', S01: 'اختر نشاطًا يتبع المشروع نفسه.', S02: 'حدّد المركز.', S03: 'صحّح التاريخ ليقع ضمن مدة المشروع.', S04: 'أدخل اسم المنشّط.', S05: 'احذف الاسم المكرر من قائمة الحضور.', S06: 'احذف الحاضر غير الموجود في السجل أو أضفه من «المستفيدون».',
  S07: 'تأكد من عمر المستفيد أو فئة النشاط؛ هذا تحذير فقط.', S08: 'صحّح عمر المستفيد ليقع ضمن الفئات العمرية للقالب.', S09: 'اجعل كل الأعداد صحيحة وغير سالبة.', S10: 'أضف توزيع الفئات العمرية للجلسة.', S11: 'اجعل مجموع الفئات العمرية يساوي العدد الكلي.', S12: 'أضف حضورًا للجلسة أو احذفها.', S13: 'إن كانت مكررة فاحذف إحداها.', S14: 'مستفيد مسجَّل في أكثر من جلسة للنشاط نفسه في اليوم نفسه؛ احذف المكرر.',
  T00: 'اربط السجل بمشروع أو احذفه.', T01: 'اختر نشاطًا موجودًا.', T02: 'اختر نشاطًا تشغيليًا.', T03: 'صحّح التاريخ ليقع ضمن مدة المشروع.', T04: 'التاريخ مستقبلي؛ صحّحه.', T05: 'الكمية عدد صحيح موجب.', T06: 'أدخل المرجع / دليل التحقق.', T07: 'اختر مركزًا موجودًا.', T08: 'إن كان مكررًا فاحذفه.',
  O01: 'الرمز غير موجود في السجل؛ أضف المستفيد أو صحّح الرمز في الاستبيان.', O02: 'احذف الردّ المكرر.', O03: 'الردّ بلا تاريخ؛ أعد استيراده بتاريخ.', O04: 'اربط مؤشر النتائج باستبيان من «مؤشرات النتائج».',
  X01: 'قارن مجموع حضور الجلسات بلوحة القيادة؛ غالبًا جلسات ناقصة أو مكررة.', X02: 'حضور كشوف الأسماء لا يطابق سجل المستفيدين؛ راجع الجلسات والأسماء.', X03: 'مؤشر PTT لا يطابق STT؛ راجع ربط الأنشطة بالمؤشر.', X04: 'الفريدون أكثر من الحضور؛ راجع تكرار الأسماء.',
  X05: 'تفصيل المستفيدين لا يطابق المتوقع؛ راجع الفئات العمرية للمستفيدين.', X06: 'بعض المشاركين بلا فئة عمرية؛ أكمل أعمارهم.', X07: 'خطة العمل لا تطابق STT؛ راجع تواريخ الجلسات وربطها بالأنشطة.', X08: 'جلسات خارج أشهر القالب الاثني عشر؛ راجع تاريخ بداية المشروع.', X09: 'المباشرون أكثر من الفريدين؛ راجع قاعدة المستفيد المباشر.',
};
const pj = (db, id) => db.projects.find((p) => p.id === id);
// يحدد الوجهة: { route, pid, open() }
export function resolve(i, db) {
  const c = i.code, id = String(i.ref ?? '');
  const proj = (f) => db.projects.find(f);
  if (c[0] === 'B') { const bid = id.split(',')[0]; return { route: 'bnf', label: 'فتح المستفيد', open: () => openBnf(bid) }; }
  if (c === 'P01') return { route: 'projects', pid: id, label: 'فتح المشروع' };
  if (c === 'P02') return { route: 'projects', pid: proj((p) => (p.activities || []).some((a) => a.id === id))?.id, label: 'فتح الأنشطة' };
  if (c === 'P03') return { route: 'projects', pid: proj((p) => (p.outputIndicators || []).some((o) => o.id === id))?.id, label: 'فتح المؤشرات' };
  if (c[0] === 'S' && c !== 'S14') { const s = db.sessions.find((x) => x.id === id); if (!s) return { route: 'sessions', label: 'فتح الجلسات' }; if (s.sheetId) return { route: 'sheets', pid: s.projectId, label: 'فتح الكشف', open: () => openSheet(s.sheetId) }; return { route: 'sessions', pid: s.projectId, label: 'تعديل الجلسة', open: () => ctx.openSession(id) }; }
  if (c === 'S14') return { route: 'sessions', label: 'فتح الجلسات' };
  if (c[0] === 'T') { const o = db.ops.find((x) => x.id === id); return { route: 'ops', pid: o?.projectId, label: 'تعديل سجل الإنجاز', open: () => ctx.openOp(id) }; }
  if (c === 'O04') return { route: 'projects', pid: proj((p) => (p.outcomeIndicators || []).some((o) => o.id === id))?.id, label: 'فتح مؤشرات النتائج' };
  if (c[0] === 'O') { const r = db.surveyResponses.find((x) => x.id === id); return { route: 'surveys', pid: r?.projectId, label: 'فتح الاستبيانات' }; }
  if (c === 'X03' || c === 'X04') return { route: 'projects', pid: proj((p) => (p.outputIndicators || []).some((o) => o.id === id))?.id, label: 'فتح المؤشرات' };
  if (['X06', 'X05'].includes(c)) return { route: 'bnf', pid: id, label: 'فتح المستفيدين' };
  if (c === 'X08') return { route: 'projects', pid: id, label: 'فتح المشروع' };
  return { route: 'sessions', pid: id, label: 'فتح الجلسات' };
}
const now = () => [...reconcile(ctx.db), ...validateEntry(ctx.db)];
const same = (a, b) => a.code === b.code && String(a.ref) === String(b.ref);
function openCur() {
  const it = q.items[q.i], r = resolve(it, ctx.db), p = r.pid && pj(ctx.db, r.pid); if (p) ctx.ui.projectId = p.id;
  ctx.go(r.route); r.open?.(); render();
}
export function start(items, i = 0) { q = { items: items.map((x) => ({ ...x })), i }; if (!q.items.length) { q = null; return; } openCur(); }
export function end(goCheck = true) { q = null; document.querySelector('#fixbar')?.remove(); if (goCheck) ctx.go('check'); }
function next() {
  const alive = now(), cur = q.items[q.i], solved = !alive.some((x) => same(x, cur));
  q.items = q.items.filter((x, k) => k > q.i ? alive.some((a) => same(a, x)) : true); // الباقي فقط
  if (solved) ctx.toast('✔ تمت معالجتها');
  if (q.i + 1 >= q.items.length) { ctx.toast(solved ? 'انتهت المعالجة' : 'انتهت القائمة (بقيت ملاحظات لم تُعالج)'); return end(); }
  q.i++; openCur();
}
export const active = () => !!q;
export function render() {
  document.querySelector('#fixbar')?.remove(); if (!q) return; const it = q.items[q.i], r = resolve(it, ctx.db), v = document.querySelector('#view'); if (!v) return;
  const alive = now().some((x) => same(x, it));
  const b = document.createElement('div'); b.id = 'fixbar'; b.className = 'card fixbar';
  b.innerHTML = `<div class="row"><b>معالجة ${q.i + 1} من ${q.items.length}</b><span class="badge b-${it.level}">${{ error: 'خطأ', warn: 'تحذير', info: 'للعلم' }[it.level]}</span><span class="badge ${alive ? 'b-warn' : 'b-ok'}">${alive ? 'لم تُعالج بعد' : '✔ عولجت'}</span></div>
   <p style="margin:.3rem 0">${esc(it.msg)}</p><p class="small" style="margin:0 0 .5rem">${esc(HOW[it.code] || '')}</p>
   <div class="row"><button data-act="fixNext">${q.i + 1 >= q.items.length ? 'إنهاء' : 'التالي ›'}</button><button class="sec" data-act="fixReopen">${esc(r.label)}</button><button class="sec" data-act="fixEnd">العودة لصفحة التحقق</button></div>`;
  v.prepend(b);
}
export const fixActions = { fixNext() { next(); }, fixReopen() { openCur(); }, fixEnd() { end(true); } };
export const issuesOf = () => now();
export const canFix = (i) => !!resolve(i, ctx.db);
