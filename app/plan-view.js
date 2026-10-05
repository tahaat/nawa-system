// شاشة «ملف PTT الكامل»: إدخال الأوراق اليدوية في القالب
import { SECTORS, PARTNERS, TGROUPS, LF_ROWS, MEAL_ROWS, PROF_FIELDS, LEARN_SOURCES, LEARN_STATUS, profileOf } from '../core/plan.js';
import { uid } from '../core/model.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = [['info', 'معلومات المشروع'], ['lf', 'الإطار المنطقي'], ['targets', 'المستهدفات وخطوط الأساس'], ['prof', 'ملف المؤشرات'], ['meal', 'MEAL Calendar'], ['assump', 'الافتراضات'], ['learn', 'إدارة التعلم']];
let tab = 'info', ctx;
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function set(o, path, v) { const ks = path.split('.'); let t = o; ks.forEach((k, i) => { if (i === ks.length - 1) t[k] = v; else t = t[k] ??= (/^\d+$/.test(ks[i + 1]) ? [] : {}); }); }
const inp = (p, path, o = {}) => { const v = get(p, path); return `<input data-p="${path}" ${o.type ? `type="${o.type}" data-t="${o.type}"` : ''} value="${esc(v)}" ${o.w ? `style="width:${o.w}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>`; };
const area = (p, path, rows = 2) => `<textarea data-p="${path}" rows="${rows}" style="width:100%">${esc(get(p, path))}</textarea>`;
const selOpt = (p, path, opts) => `<select data-p="${path}"><option value=""></option>${opts.map((x) => `<option ${get(p, path) === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
const checks = (p, path, list) => list.map(([n]) => `<label class="chk"><input type="checkbox" data-pc="${path}" value="${esc(n)}" ${(get(p, path) || []).includes(n) ? 'checked' : ''}> ${esc(n)}</label>`).join(' ');

let bound = false;
export function initPlan(c) {
  ctx = c; if (bound) return; bound = true;
  document.addEventListener('change', (e) => {
    const t = e.target, p = ctx.project(); if (!p) return;
    if (t.dataset?.pb) { set(p, t.dataset.pb, t.checked); ctx.save(); }
    else if (t.dataset?.lines) { set(p, t.dataset.lines, t.value.split('\n').map((x) => x.trim()).filter(Boolean)); ctx.save(); }
    else if (t.dataset?.p) { set(p, t.dataset.p, t.dataset.t === 'number' ? (t.value === '' ? null : +t.value) : t.value === '' ? undefined : t.value); ctx.save(); }
    else if (t.dataset?.pc) { const cur = new Set(get(p, t.dataset.pc) || []); t.checked ? cur.add(t.value) : cur.delete(t.value); set(p, t.dataset.pc, [...cur]); ctx.save(); }
    else if (t.dataset?.pw) { const [path, w] = t.dataset.pw.split('@'); const cur = new Set(get(p, path) || []); t.checked ? cur.add(+w) : cur.delete(+w); set(p, path, [...cur].sort((a, b) => a - b)); ctx.save(); }
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-pa]'); if (!t) return; const p = ctx.project(), a = t.dataset.pa;
    if (a === 'tab') tab = t.dataset.v;
    else if (a === 'add') { (p[t.dataset.v] ||= []).push({}); ctx.save(); }
    else if (a === 'del') { p[t.dataset.v].splice(+t.dataset.i, 1); ctx.save(); }
    else if (a === 'rep') { (p.info ||= {}).reports ||= []; p.info.reports.push({}); ctx.save(); }
    ctx.rerender();
  });
}
const inds = (p) => [...(p.outcomeIndicators || []).map((o) => ({ o, kind: 'outcome' })), ...(p.outputIndicators || []).map((o) => ({ o, kind: 'output' }))];
const catHead = '<th>ذكور</th><th>إناث</th><th>ذكور (إعاقة)</th><th>إناث (إعاقة)</th>';
const CATK = ['M', 'F', 'CWD_M', 'CWD_F'];

export function vPlan() {
  const p = ctx.project(); if (!p) return ctx.empty();
  p.info ||= {};
  const head = `<div class="card row">${TABS.map(([k, t]) => `<button class="${k === tab ? '' : 'sec'}" data-pa="tab" data-v="${k}">${t}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'info') body = `<div class="card"><h2>معلومات المشروع (Poject Info. Sheet)</h2>
    <div class="row"><label>رمز المشروع${inp(p, 'info.code')}</label><label>عنوان المشروع${inp(p, 'info.title', { w: '340px' })}</label><label>مدير/منسق المشروع${inp(p, 'info.manager')}</label><label>التغطية الجغرافية${inp(p, 'info.geo')}</label></div>
    <label>الهدف العام${area(p, 'info.objective')}</label><label>ملخص التدخل${area(p, 'info.summary', 3)}</label>
    <div class="row"><label>الميزانية الكلية${inp(p, 'info.budget', { type: 'number', w: '120px' })}</label><label>حصة الممول${inp(p, 'info.donorShare', { type: 'number', w: '120px' })}</label><label>حصة نوى${inp(p, 'info.nawaShare', { type: 'number', w: '120px' })}</label><label>العملة${inp(p, 'info.currency', { w: '70px' })}</label>
    <label>المصروف حتى الآن (للوحة المؤشرات)${inp(p, 'info.budgetSpent', { type: 'number', w: '120px' })}</label><label>إجمالي المستفيدين المباشرين المخطط${inp(p, 'info.directPlanned', { type: 'number', w: '120px' })}</label></div>
    <div class="row"><label>طلب تعديل (MR)؟<select data-p="info.amend" data-b="1"><option value="">لا</option><option value="true" ${p.info.amend ? 'selected' : ''}>نعم</option></select></label><label>تاريخ MR${inp(p, 'info.amendDate', { type: 'date' })}</label><label>الشرح${inp(p, 'info.amendNote', { w: '300px' })}</label></div>
    <h3>القطاعات</h3><div class="row">${checks(p, 'info.sectors', SECTORS)}</div><h3>الشركاء المنفذون</h3><div class="row">${checks(p, 'info.partners', PARTNERS)}</div><h3>الفئات المستهدفة</h3><div class="row">${checks(p, 'info.targetGroups', TGROUPS)}</div>
    <h3>تقارير الممول (حتى 9)</h3><table><tr><th>#</th><th>من</th><th>إلى</th><th>تاريخ التسليم</th><th>المسؤول</th></tr>${(p.info.reports || []).map((r, i) => `<tr><td>${i + 1}</td><td>${inp(p, `info.reports.${i}.from`, { type: 'date' })}</td><td>${inp(p, `info.reports.${i}.to`, { type: 'date' })}</td><td>${inp(p, `info.reports.${i}.submit`, { type: 'date' })}</td><td>${inp(p, `info.reports.${i}.resp`)}</td></tr>`).join('')}</table><button class="sec" data-pa="rep" ${(p.info.reports || []).length >= 9 ? 'disabled' : ''}>+ تقرير</button>
    <p class="small">تاريخ البداية والنهاية والممول والاسم تؤخذ من شاشة «المشاريع».</p></div>`;
  else if (tab === 'lf') body = `<div class="card"><h2>الإطار المنطقي (Log frame)</h2><p class="small">أدخل الوصف والمؤشرات والمستهدف ومصادر التحقق والمخاطر لكل مستوى. صفوف الأنشطة وصف فقط.</p>
    <div class="tw"><table><tr><th>المستوى</th><th>الوصف</th><th>المؤشرات</th><th>المستهدف</th><th>مصادر التحقق</th><th>المخاطر والافتراضات</th></tr>${LF_ROWS.map(([r, lbl, kind]) => `<tr><td>${esc(lbl)}</td><td>${inp(p, `logframe.${r}.text`)}</td>${kind === 'full' ? ['ind', 'target', 'src', 'risk'].map((k) => `<td>${inp(p, `logframe.${r}.${k}`)}</td>`).join('') : '<td colspan="4" class="small">—</td>'}</tr>`).join('')}</table></div></div>`;
  else if (tab === 'targets') body = `<div class="card"><h2>خطوط الأساس والمستهدفات (جدول PTT)</h2><p class="small">لكل مؤشر: خط الأساس والمستهدف حسب الفئة، وتاريخا البداية والنهاية، والتعليق السردي. الفعلي يُحسب تلقائيًا من البيانات.</p>
    <div class="tw"><table><tr><th>المؤشر</th><th colspan="4">خط الأساس</th><th colspan="4">المستهدف</th><th>بداية</th><th>نهاية</th><th>تعليق</th></tr><tr><th></th>${catHead}${catHead}<th></th><th></th><th></th></tr>
    ${(() => { const rows = []; const mk = (arr, key) => (arr || []).forEach((o, i) => rows.push(`<tr><td>${esc(o.name)}</td>${['baseline', 'target'].map((g) => CATK.map((c) => `<td>${inp(p, `${key}.${i}.${g}.${c}`, { type: 'number', w: '56px' })}</td>`).join('')).join('')}<td>${inp(p, `${key}.${i}.start`, { type: 'date' })}</td><td>${inp(p, `${key}.${i}.end`, { type: 'date' })}</td><td>${inp(p, `${key}.${i}.narrative`)}</td></tr>`));
      mk(p.outcomeIndicators, 'outcomeIndicators'); mk(p.outputIndicators, 'outputIndicators'); return rows.join('') || '<tr><td colspan="13">أضف مؤشرات في شاشة «المشاريع» أولًا</td></tr>'; })()}
    <tr><td><b>المستفيدون المباشرون (المستهدف)</b></td><td colspan="4"></td>${CATK.map((c) => `<td>${inp(p, `directTarget.${c}`, { type: 'number', w: '56px' })}</td>`).join('')}<td colspan="3"></td></tr></table></div></div>`;
  else if (tab === 'prof') body = `<div class="card"><h2>ملف المؤشرات (Indicator Profile)</h2><p class="small">القيم الافتراضية جاهزة (تُملأ تلقائيًا إن تركتها فارغة)، عدّل ما يلزم.</p>
    <h3>الهدف العام</h3>${(() => { p.impact ||= {}; return `<div class="row"><label>الوصف${inp(p, 'impact.text', { w: '340px' })}</label><label>المؤشر${inp(p, 'impact.indicator', { w: '340px' })}</label></div>`; })()}
    ${inds(p).map(({ o, kind }) => { const pr = profileOf(p, o, kind); return `<details><summary><b>${esc(o.name)}</b> <span class="small">(${kind === 'outcome' ? 'نتيجة' : 'مخرج'})</span></summary><div class="grid g2">${PROF_FIELDS.map(([k, t]) => `<label>${t}<input data-p="profile.${o.id}.${k}" value="${esc(((p.profile || {})[o.id] || {})[k] ?? '')}" placeholder="${esc(pr[k] ?? '')}"></label>`).join('')}</div></details>`; }).join('') || '<p>لا مؤشرات بعد.</p>'}</div>`;
  else if (tab === 'meal') body = `<div class="card"><h2>MEAL Calendar</h2><p class="small">اختر الأسابيع المخططة والمنفذة لكل نشاط (48 أسبوعًا = 12 شهرًا من بداية المشروع). نسبة الإنجاز والمجاميع تُحسب في الملف.</p>
    ${MEAL_ROWS.map(([r, name, target, resp, freq]) => { const s = (p.meal || {})[r] || {}; return `<details><summary><b>${esc(s.name ?? name)}</b> <span class="small">مخطط ${(s.planned || []).length} / منفذ ${(s.actual || []).length}</span></summary>
      <div class="row"><label>الاسم${inp(p, `meal.${r}.name`, { w: '300px', ph: name })}</label><label>المستهدف${inp(p, `meal.${r}.target`, { type: 'number', w: '70px', ph: target ?? '' })}</label><label>المسؤول${inp(p, `meal.${r}.resp`, { ph: resp })}</label><label>التكرار${inp(p, `meal.${r}.freq`, { ph: freq })}</label></div>
      ${['planned', 'actual'].map((k) => `<div class="small">${k === 'planned' ? 'مخطط' : 'منفذ'}</div><div class="wk">${Array.from({ length: 48 }, (_, i) => `<label title="شهر ${Math.floor(i / 4) + 1} أسبوع ${(i % 4) + 1}"><input type="checkbox" data-pw="meal.${r}.${k}@${i + 1}" ${(s[k] || []).includes(i + 1) ? 'checked' : ''}>${(i % 4) + 1}</label>${i % 4 === 3 ? '<span class="sep"></span>' : ''}`).join('')}</div>`).join('')}</details>`; }).join('')}</div>`;
  else if (tab === 'assump') body = `<div class="card"><h2>متابعة الافتراضات</h2><table><tr><th>الافتراض</th><th>إجراءات التخفيف</th><th>هل تحقق؟</th><th>الاستراتيجية المتبعة</th><th></th></tr>${(p.assumptions || []).map((a, i) => `<tr><td>${inp(p, `assumptions.${i}.text`)}</td><td>${inp(p, `assumptions.${i}.mitigation`)}</td><td>${selOpt(p, `assumptions.${i}.fulfilled`, ['YES', 'ONLY PARTLY', 'NO'])}</td><td>${inp(p, `assumptions.${i}.strategy`)}</td><td><button class="x" data-pa="del" data-v="assumptions" data-i="${i}">حذف</button></td></tr>`).join('')}</table><button class="sec" data-pa="add" data-v="assumptions" ${(p.assumptions || []).length >= 9 ? 'disabled' : ''}>+ افتراض</button><p class="small">حتى 9 صفوف (سعة القالب).</p></div>`;
  else if (tab === 'learn') body = `<div class="card"><h2>إدارة التعلم</h2><div class="tw"><table><tr><th>#</th><th>النتيجة</th><th>النشاط</th><th>مصدر التعلم</th><th>توصية/تعلّم</th><th>تاريخ الإضافة</th><th>الإجراء</th><th>الموعد</th><th>المسؤول</th><th>الحالة</th><th>تعليقات</th><th></th></tr>${(p.learning || []).map((a, i) => `<tr><td>${i + 1}</td><td>${selOpt(p, `learning.${i}.result`, ['R1', 'R2', 'R3'])}</td><td>${inp(p, `learning.${i}.activity`)}</td><td>${selOpt(p, `learning.${i}.source`, LEARN_SOURCES)}</td><td>${inp(p, `learning.${i}.rec`, { w: '220px' })}</td><td>${inp(p, `learning.${i}.date`, { type: 'date' })}</td><td>${inp(p, `learning.${i}.action`)}</td><td>${inp(p, `learning.${i}.deadline`, { type: 'date' })}</td><td>${inp(p, `learning.${i}.resp`)}</td><td>${selOpt(p, `learning.${i}.status`, LEARN_STATUS)}</td><td>${inp(p, `learning.${i}.comments`)}</td><td><button class="x" data-pa="del" data-v="learning" data-i="${i}">حذف</button></td></tr>`).join('')}</table></div><button class="sec" data-pa="add" data-v="learning">+ توصية</button></div>`;
  ctx.view().innerHTML = head + body;
}
