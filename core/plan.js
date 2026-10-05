// أوراق PTT اليدوية: معلومات المشروع، الإطار المنطقي، ملف المؤشرات، جدول PTT الرئيسي، MEAL Calendar، الافتراضات، إدارة التعلم
import { colName, excelSerial } from './xlsx-patch.js';
import { CATS } from './model.js';
import { directBeneficiaries } from './aggregate.js';

export const SECTORS = [['Cultural', 14], ['Artistic', 15], ['Educational', 16], ['Psychosocial Support (Mental Health)', 17]];
export const PARTNERS = [['INGO', 18], ['NGO', 19], ['Local Government (Ministries) MoEHE', 20], ['CBOs', 21], ['UN agencies', 22]];
export const TGROUPS = [['Children- School age', 25], ['children pre school', 26], ['Parents', 27], ['Local Educators', 28], ['Nawa Educators', 29]];
// صفوف الإطار المنطقي: kind full = (وصف + مؤشرات + مستهدف + مصادر تحقق + مخاطر)، text = وصف فقط (خلايا مدمجة B:F)
export const LF_ROWS = [
  [3, 'Overall Impact', 'full'], [5, 'Outcome (1)', 'full'], [7, 'Output 1.1', 'full'], [8, 'Activities 1.1 — سطر 1', 'text'], [9, 'سطر 2', 'text'], [10, 'سطر 3', 'text'], [11, 'سطر 4', 'text'], [12, 'سطر 5', 'text'], [13, 'سطر 6', 'text'], [14, 'سطر 7', 'text'], [15, 'سطر 8', 'text'],
  [17, 'Output 1.2', 'full'], [18, 'Outcome (2)', 'full'], [20, 'Output 2.1', 'full'], [21, 'Output 2.2', 'full'], [22, 'Activities 2.2', 'text'], [23, 'Outcome (3)', 'full'], [27, 'Output 3.1', 'full'],
  [29, 'Activities 3.1 — سطر 1', 'text'], [30, 'سطر 2', 'text'], [31, 'سطر 3', 'text'], [32, 'سطر 4', 'text'], [33, 'Output 3.2', 'full'], [35, 'Activities (آخر)', 'text']];
// أنشطة MEAL الورقية (أوراق القالب فقط تُملأ؛ صفوف المجاميع معادلات)
export const MEAL_ROWS = [
  [7, '1.1 Monitoring visits — Data collection', 5, 'MEAL department', 'monthly'], [9, '1.1 Monitoring visits — Draft report', 5, 'MEAL department', 'monthly'], [11, '1.1 Monitoring visits — Final report', 4, 'MEAL Officer', 'monthly'],
  [15, 'Baseline — Development of the tools', 1, 'MEAL Officer', ''], [17, 'Baseline — Data collection', 2, 'Project staff', ''], [19, 'Baseline — Data entry/cleaning', 2, 'MEAL department', ''], [21, 'Baseline — Data analysis', 2, 'MEAL department', ''], [23, 'Baseline — Reporting', 1, 'MEAL Officer', ''],
  [27, 'Endline — Development of the tools', null, 'MEAL Officer', ''], [29, 'Endline — Data collection', null, 'Project staff', ''], [31, 'Endline — Data entry/cleaning', null, 'MEAL department', ''], [33, 'Endline — Data analysis', null, 'MEAL department', ''], [35, 'Endline — Reporting', null, 'MEAL Officer', ''],
  [39, '2.1 Developing the joint feedback/complaint form', null, '', ''], [41, '2.2 Receiving and documenting complaints and feedback', null, '', ''], [43, '2.3 Analyzing forms and preparing response letters', null, '', ''], [45, '2.4 Summary report of complaints/feedback', null, '', ''],
  [51, 'Mid-term Review — Develop the workshop agenda', null, 'MEAL Department', ''], [53, 'Mid-term Review — Conducting the workshop', null, 'MEAL Officer', ''], [55, 'Mid-term Review — First draft of the report', null, 'Project Coordinator', ''], [57, 'Mid-term Review — Finalize the report', null, 'MEAL Department / executive director', ''], [59, 'Mid-term Review — Management response plan', null, 'Project Coordinator', ''],
  [63, '4.1 Interim Narrative Report', null, 'MEAL Officer / Executive director', 'semi-annual'], [65, '4.2 Final Narrative Report', null, 'MEAL Officer / Executive director', 'end of project']];
export const LEARN_SOURCES = ['PDM', 'Monitoring Visit', 'FGD', 'Lessons learned exercise', 'Other'];
export const LEARN_STATUS = ['not implemented', 'in progress', 'done'];

const DEFPROF = {
  output: { disagg: 'Sex, age group, disability', calc: 'Count of participants from session attendance (STT/BTT)', dataFreq: 'Monthly', repFreq: 'Quarterly', mov: 'Attendance sheets, BTT', source: 'STT & BTT (Nawa MEAL system)', method: 'Attendance registration at each session', mis: 'Nawa MEAL system', collect: 'Educators / coordinators', entry: 'Data entry staff', verify: 'MEAL officer', analysis: 'MEAL officer', archive: 'Archiving unit' },
  outcome: { disagg: 'Sex, age group, disability', calc: 'Share of respondents reaching the threshold / improvement (KoBo survey)', dataFreq: 'Per round (baseline / endline)', repFreq: 'Per round', mov: 'KoBo survey responses', source: 'Beneficiary survey', method: 'KoBo Toolbox survey', mis: 'KoBo + Nawa MEAL system', collect: 'MEAL staff', entry: 'KoBo / MEAL officer', verify: 'MEAL officer', analysis: 'MEAL officer', archive: 'Archiving unit' },
};
const PROF_COLS = { logic: 'B', definition: 'D', calc: 'E', disagg: 'F', baseline: 'G', dataFreq: 'H', repFreq: 'I', mov: 'J', source: 'K', method: 'L', sampling: 'M', mis: 'N', lessons: 'O', collect: 'R', entry: 'S', verify: 'T', analysis: 'U', archive: 'V' };
export const PROF_FIELDS = [['logic', 'منطق التدخل'], ['definition', 'التعريف'], ['calc', 'طريقة الحساب'], ['disagg', 'التصنيف'], ['baseline', 'متطلبات خط الأساس'], ['dataFreq', 'تكرار جمع البيانات'], ['repFreq', 'تكرار التقرير'], ['mov', 'وسائل التحقق'], ['source', 'مصدر البيانات'], ['method', 'طريقة الجمع'], ['sampling', 'العينة'], ['mis', 'MIS'], ['lessons', 'الدروس'], ['collect', 'جمع البيانات (المسؤول)'], ['entry', 'إدخال البيانات'], ['verify', 'التحقق'], ['analysis', 'التحليل'], ['archive', 'الأرشفة']];
export const profileOf = (p, ind, kind) => ({ ...DEFPROF[kind], ...((p.profile || {})[ind?.id ?? kind] || {}) });

const D = (d) => (d ? excelSerial(d) : null);
const OUT_SLOTS = { 'output 1': [4, 5, 6], 'output 2': [7, 8, 9, 10], 'output 3': [11, 12, 13, 14, 15, 16] };
export function outputSlots(project) { // مؤشر المخرج → صف في ورقة Output indicators
  const used = {}, m = new Map();
  for (const o of project.outputIndicators || []) { const sl = OUT_SLOTS[o.output], n = (used[o.output] = (used[o.output] || 0) + 1); if (sl && n <= sl.length) m.set(o.id, sl[n - 1]); }
  return m;
}
const monthStart = (project, i) => { const s = new Date(`${project.start}T00:00:00Z`); return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1)).toISOString().slice(0, 10); };
const mealState = (p, row) => (p.meal || {})[row] || {};

// يكتب الأوراق اليدوية في القالب. x = openXlsx
export async function exportPlanSheets(x, project, db) {
  const w = [], info = project.info || {};
  // ---- معلومات المشروع ----
  {
    const c = {}, f = (a, v) => { c[a] = v; };
    f('C2', info.code ?? null); f('C3', info.title || project.name); f('C4', info.objective ?? null); f('C5', info.summary ?? null);
    f('C6', D(project.start)); f('H6', D(project.end)); f('C7', info.manager ?? null);
    if (project.start && project.end) { const m = Math.round((Date.parse(project.end) - Date.parse(project.start)) / (30.4375 * 86400000)); f('H7', `${m} months`); }
    f('C8', info.budget ?? null); f('H8', info.currency ?? null); f('C9', info.donorShare ?? null); f('H9', info.currency ?? null); f('C10', info.nawaShare ?? null); f('H10', info.currency ?? null);
    f('C11', info.directPlanned ?? null); f('C12', !!info.amend); f('G12', D(info.amendDate)); f('H12', info.amend && info.amendNote ? `If Yes, please explain. ${info.amendNote}` : 'If Yes, please explain.');
    f('C13', project.donor ?? null); f('C23', info.geo ?? 'Deir Al Balah');
    for (const [n, r] of SECTORS) f('H' + r, (info.sectors || []).includes(n));
    for (const [n, r] of PARTNERS) f('G' + r, (info.partners || []).includes(n));
    for (const [n, r] of TGROUPS) f('G' + r, (info.targetGroups || []).includes(n));
    for (let i = 0; i < 9; i++) { const r = info.reports?.[i] || {}, row = 32 + i; f('E' + row, D(r.from)); f('F' + row, D(r.to)); f('G' + row, D(r.submit)); f('H' + row, r.resp ?? null); }
    await x.set('Poject Info. Sheet', c);
    if (info.directPlanned == null) w.push('معلومات المشروع: «إجمالي المستفيدين المباشرين المخطط» غير مُدخل (القيمة الافتراضية في القالب كانت 7595 وتم تفريغها)');
  }
  // ---- لوحة المؤشرات (المدخلات اليدوية) ----
  await x.set('Overview Dashboard', { D3: info.budgetSpent ?? null, D4: info.duration ?? (project.start && project.end ? `${project.start} → ${project.end}` : null) });
  // ---- الإطار المنطقي ----
  {
    const c = { A1: info.title || project.name }, lf = project.logframe || {};
    for (const [r, , kind] of LF_ROWS) { const v = lf[r] || {}; c['B' + r] = v.text ?? null; if (kind === 'full') { c['C' + r] = v.ind ?? null; c['D' + r] = v.target ?? null; c['E' + r] = v.src ?? null; c['F' + r] = v.risk ?? null; } }
    await x.set('Log frame', c);
  }
  // ---- ملف المؤشرات ----
  {
    const c = {}, clear = (r) => { for (const col of ['B', 'C', ...Object.values(PROF_COLS)]) c[col + r] = null; };
    [3, ...Array(7).fill(0).map((_, i) => 5 + i), ...Array(12).fill(0).map((_, i) => 13 + i)].forEach(clear);
    const put = (r, name, pr) => { c['C' + r] = name; for (const [k, col] of Object.entries(PROF_COLS)) c[col + r] = pr[k] ?? null; };
    put(3, project.impact?.indicator ?? null, { ...DEFPROF.outcome, ...(project.profile?.impact || {}), logic: project.impact?.text ?? project.profile?.impact?.logic ?? null });
    (project.outcomeIndicators || []).slice(0, 7).forEach((o, i) => put(5 + i, o.name, profileOf(project, o, 'outcome')));
    if ((project.outcomeIndicators || []).length > 7) w.push('ملف المؤشرات: عدد مؤشرات النتائج يتجاوز 7 صفوف');
    (project.outputIndicators || []).slice(0, 12).forEach((o, i) => put(13 + i, o.name, { ...profileOf(project, o, 'output'), logic: profileOf(project, o, 'output').logic ?? o.output }));
    if ((project.outputIndicators || []).length > 12) w.push('ملف المؤشرات: عدد مؤشرات المخرجات يتجاوز 12 صفًا');
    await x.set('Indicator Profile', c);
  }
  // ---- جدول PTT الرئيسي (خطوط الأساس والمستهدفات) ----
  {
    const c = {}, rowsAll = [3, 4, 6, 7, 8, 9, 10, 11, 12, ...Array.from({ length: 13 }, (_, i) => 13 + i)];
    for (const r of rowsAll) for (const col of ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'Z']) c[col + r] = null;
    const fill = (r, ind, label) => { const b = ind.baseline || {}, t = ind.target || {}; c['B' + r] = label; c['C' + r] = ind.name; c['D' + r] = D(ind.start || project.start); c['E' + r] = D(ind.end || project.end);
      CATS.forEach((k, j) => { c[colName(6 + j) + r] = b[k] ?? null; c[colName(11 + j) + r] = t[k] ?? null; }); c['Z' + r] = ind.narrative ?? null; };
    for (const o of project.outcomeIndicators || []) { if (!o.row) continue; const r = o.row <= 5 ? o.row - 1 : o.row; fill(r, o, o.row <= 5 ? 'Overall Objective' : 'Outcome'); }
    const slots = outputSlots(project);
    for (const o of project.outputIndicators || []) { const s = slots.get(o.id); if (s) fill(s + 9, o, o.output); }
    // صف 15 في القالب يشير خطأً إلى D6 بدل AZ6..BC6 — نصحّحه
    c.P15 = { f: "'Output indicators'!AZ6" }; c.Q15 = { f: "'Output indicators'!BA6" }; c.R15 = { f: "'Output indicators'!BB6" }; c.S15 = { f: "'Output indicators'!BC6" };
    c.T15 = { f: 'SUM(P15:S15)' }; c.V15 = { f: 'Q15/L15' }; c.W15 = { f: 'R15/M15' }; c.X15 = { f: 'S15/N15' }; c.Y15 = { f: 'T15/O15' };
    // المستفيدون المباشرون: الفعلي من محرك النظام (أفراد فريدون) بدل جمع المؤشرات
    const dir = directBeneficiaries(project, db).direct, cx = { bnf: new Map(db.beneficiaries.map((b) => [b.id, b])) }, tot = { M: 0, F: 0, CWD_M: 0, CWD_F: 0 };
    for (const id of dir) { const b = cx.bnf.get(id); if (b) tot[(b.disability ? 'CWD_' : '') + b.sex]++; }
    CATS.forEach((k, j) => { c[colName(16 + j) + 5] = tot[k]; if (project.directTarget?.[k] != null) c[colName(11 + j) + 5] = project.directTarget[k]; });
    await x.set('Project Tracking Table -PTT', c);
    const manualOnly = Object.values(tot).reduce((a, b) => a + b, 0);
    if (manualOnly === 0 && (project.outputIndicators || []).length) w.push('جدول PTT: لا مستفيدون مباشرون مسجَّلون بالأسماء — صف «# of direct BNFS» الفعلي = 0');
  }
  // ---- MEAL Calendar ----
  {
    const c = {}; for (let i = 0; i < 12; i++) c[colName(8 + i * 4) + '1'] = excelSerial(monthStart(project, i));
    for (const [row, name, target, resp, freq] of MEAL_ROWS) {
      const s = mealState(project, row); c['B' + row] = s.name ?? name; c['C' + row] = s.target ?? target; c['D' + row] = s.resp ?? resp; c['E' + row] = s.freq ?? freq;
      for (let k = 0; k < 48; k++) { c[colName(8 + k) + row] = (s.planned || []).includes(k + 1) ? 1 : null; c[colName(8 + k) + (row + 1)] = (s.actual || []).includes(k + 1) ? 1 : null; }
    }
    await x.set('MEAL Calendar', c);
  }
  // ---- الافتراضات ----
  { const c = {}, a = project.assumptions || []; for (let i = 0; i < 9; i++) { const v = a[i] || {}, r = 2 + i; c['A' + r] = v.text ?? null; c['B' + r] = v.mitigation ?? null; c['C' + r] = v.fulfilled || null; c['D' + r] = v.strategy ?? null; }
    if (a.length > 9) w.push('الافتراضات: عدد الصفوف يتجاوز 9'); await x.set('Assumptions Monitoring', c); }
  // ---- إدارة التعلم ----
  { const c = {}, a = project.learning || [];
    for (let i = 0; i < 67; i++) { const v = a[i] || {}, r = 2 + i; c['A' + r] = v.rec ? i + 1 : null; c['B' + r] = v.result ?? null; c['C' + r] = v.activity ?? null; c['D' + r] = v.source ?? null; c['E' + r] = v.other ?? null; c['F' + r] = v.rec ?? null; c['G' + r] = D(v.date); c['H' + r] = v.action ?? null; c['I' + r] = D(v.deadline); c['J' + r] = v.resp ?? null; c['K' + r] = v.status ?? null; c['L' + r] = v.comments ?? null; }
    if (a.length > 67) w.push('إدارة التعلم: عدد الصفوف يتجاوز 67'); await x.set('Learning Managment Process', c); }
  return w;
}
