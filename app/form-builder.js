// منشئ الاستبيانات: نماذج مخصصة تُحفظ داخل المشروع (p.forms) وتُنزَّل بصيغة XLSForm لـ KoBo
import { TEMPLATES, QTYPES, SCALES, SCALE_NAMES, questionsOf } from '../core/forms.js';
import { uid } from '../core/model.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let ctx, editing = null, bound = false;
export function initBuilder(c) {
  ctx = c; if (bound) return; bound = true;
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-fb]'); if (!t) return; const p = ctx.project(); if (!p) return; const a = t.dataset.fb, i = +t.dataset.i, f = p.forms?.[editing];
    if (a === 'new') { (p.forms ||= []).push({ id: 'f_' + uid('').slice(1, 9), ar: 'استبيان جديد', en: 'New survey', audience: 'child', mode: 'interviewer', seq: 0, questions: [] }); editing = p.forms.length - 1; }
    else if (a === 'copy') { const src = TEMPLATES.find((x) => x.id === document.getElementById('fbsrc').value); (p.forms ||= []).push({ id: 'f_' + uid('').slice(1, 9), ar: src.ar + ' (نسخة)', en: src.en + ' (copy)', audience: src.audience, mode: src.mode, noRound: !!src.noRound, questions: questionsOf(src), seq: src.items.length }); editing = p.forms.length - 1; }
    else if (a === 'edit') editing = i;
    else if (a === 'close') editing = null;
    else if (a === 'delform') { if (!confirm('حذف هذا الاستبيان؟ (الردود المستوردة تبقى محفوظة)')) return; p.forms.splice(i, 1); editing = null; }
    else if (f && a === 'addq') { f.questions.push({ type: t.dataset.type || 'scale', scale: 'agree5', ar: '', en: '', name: 'q' + (f.seq = Math.max(f.seq || 0, ...f.questions.map((q) => +String(q.name).replace(/\D/g, '') || 0)) + 1), required: true }); }
    else if (f && a === 'delq') f.questions.splice(i, 1);
    else if (f && (a === 'up' || a === 'down')) { const j = a === 'up' ? i - 1 : i + 1; if (j >= 0 && j < f.questions.length) [f.questions[i], f.questions[j]] = [f.questions[j], f.questions[i]]; }
    else return;
    ctx.save(); ctx.rerender();
  });
  document.addEventListener('change', (e) => { if (e.target.dataset?.fbre) setTimeout(() => ctx.rerender(), 0); });
}
export const isEditing = () => editing;
const p_ = (path, v, extra = '') => `<input data-p="${path}" value="${esc(v)}" ${extra}>`;
export function builderCard(p) {
  const list = p.forms || [];
  if (editing != null && list[editing]) return editor(list[editing], editing);
  return `<div class="card"><h2>منشئ الاستبيانات</h2><p class="small">أنشئ استبيانك الخاص أو انسخ قالبًا جاهزًا وعدّله، ثم نزّل ملف XLSForm وارفعه في KoBo. الأسئلة من نوع «مقياس» تُجمع في الدرجة الكلية التي تُبنى عليها مؤشرات النتائج.</p>
  <table><tr><th>الاستبيان</th><th>الأسئلة</th><th></th></tr>${list.map((f, i) => `<tr><td>${esc(f.ar)}</td><td>${f.questions.length}</td><td><button data-fb="edit" data-i="${i}">تعديل</button> <button class="sec" data-act="dlForm" data-id="${f.id}">XLSForm</button> <button class="x" data-fb="delform" data-i="${i}">حذف</button></td></tr>`).join('') || '<tr><td colspan="3" class="small">لا استبيانات مخصصة بعد</td></tr>'}</table>
  <div class="row" style="margin-top:8px"><button data-fb="new">+ استبيان جديد</button><label>أو انسخ قالبًا<select id="fbsrc">${TEMPLATES.map((t) => `<option value="${t.id}">${esc(t.ar)}</option>`).join('')}</select></label><button class="sec" data-fb="copy">نسخ وتعديل</button></div></div>`;
}
function editor(f, i) {
  const qs = f.questions, P = `forms.${i}`;
  return `<div class="card"><div class="row"><button class="sec" data-fb="close">← رجوع</button><h2 style="margin:0">تحرير: ${esc(f.ar)}</h2></div>
  <div class="row"><label>العنوان (عربي)${p_(`${P}.ar`, f.ar, 'style="width:300px"')}</label><label>العنوان (إنجليزي)${p_(`${P}.en`, f.en, 'style="width:240px"')}</label>
  <label>الفئة<select data-p="${P}.audience">${[['child', 'أطفال'], ['parent', 'أهالي'], ['educator', 'منشّطون']].map(([k, t]) => `<option value="${k}" ${f.audience === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  <label>طريقة التعبئة<select data-p="${P}.mode">${[['interviewer', 'مقابلة (مُجري المقابلة)'], ['self', 'تعبئة ذاتية']].map(([k, t]) => `<option value="${k}" ${f.mode === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  <label class="chk"><input type="checkbox" data-pb="${P}.noRound" ${f.noRound ? 'checked' : ''}> بدون مرحلة قياس (قبلي/بعدي)</label></div>
  <div class="tw"><table><tr><th>#</th><th>النوع</th><th>نص السؤال (عربي)</th><th>English (اختياري)</th><th>تفاصيل</th><th>إلزامي</th><th></th></tr>${qs.map((q, k) => `<tr><td>${k + 1}</td>
    <td><select data-p="${P}.questions.${k}.type" data-fbre="1">${QTYPES.map(([v, t]) => `<option value="${v}" ${q.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
    <td>${p_(`${P}.questions.${k}.ar`, q.ar, 'style="width:260px"')}</td><td>${p_(`${P}.questions.${k}.en`, q.en, 'style="width:200px"')}</td>
    <td>${q.type === 'scale' ? `<select data-p="${P}.questions.${k}.scale">${Object.entries(SCALE_NAMES).map(([v, t]) => `<option value="${v}" ${q.scale === v ? 'selected' : ''}>${t}: ${SCALES[v].map((x) => x[1]).join(' / ')}</option>`).join('')}</select>`
      : q.type === 'select_one' || q.type === 'select_multiple' ? `<textarea data-lines="${P}.questions.${k}.choices" rows="3" placeholder="خيار في كل سطر (عربي|English)">${esc((q.choices || []).join('\n'))}</textarea>`
      : q.type === 'integer' || q.type === 'decimal' ? `من <input type="number" data-t="number" data-p="${P}.questions.${k}.min" value="${q.min ?? ''}" style="width:60px"> إلى <input type="number" data-t="number" data-p="${P}.questions.${k}.max" value="${q.max ?? ''}" style="width:60px">` : '<span class="small">—</span>'}</td>
    <td>${q.type === 'note' ? '' : `<input type="checkbox" data-pb="${P}.questions.${k}.required" ${q.required === false ? '' : 'checked'}>`}</td>
    <td><button class="sec" data-fb="up" data-i="${k}">↑</button><button class="sec" data-fb="down" data-i="${k}">↓</button><button class="x" data-fb="delq" data-i="${k}">✕</button></td></tr>`).join('')}</table></div>
  <div class="row" style="margin-top:8px">${QTYPES.map(([v, t]) => `<button class="sec" data-fb="addq" data-type="${v}">+ ${t}</button>`).join('')}</div>
  <p class="small">${qs.filter((q) => q.type === 'scale').length} سؤال مقياس يدخل في الدرجة. الأسئلة الثابتة (رمز المستفيد، المرحلة، المركز، التاريخ) تضاف تلقائيًا.</p>
  <div class="row"><button data-act="dlForm" data-id="${f.id}">تنزيل XLSForm</button></div></div>`;
}
