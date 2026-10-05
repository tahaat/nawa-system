import { openXlsx, colName, excelSerial } from './xlsx-patch.js';
import { outputMonthly, breakdown, workplanActual, directBeneficiaries } from './aggregate.js';
import { CATS } from './model.js';
import { computeOutcomes } from './outcomes.js';

const monthStart = (project, i) => { const s = new Date(`${project.start}T00:00:00Z`); return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1)).toISOString().slice(0, 10); };
const OUT_SLOTS = { 'output 1': [4, 5, 6], 'output 2': [7, 8, 9, 10], 'output 3': [11, 12, 13, 14, 15, 16] };
const BD_BLOCKS = { 1: { M: 43, F: 51 }, 2: { M: 60, F: 68 }, 3: { M: 77, F: 85 }, 4: { M: 94, F: 102 } };
const MALE_COL = 5, CWD_COL = 12; // E.. و L..

// يملأ قالب Annex 5 بالقيم المحسوبة. templateBuf: ArrayBuffer/Uint8Array. يعيد {data, warnings}
export async function exportPTT(templateBuf, project, db, DOMParserCtor, XMLSerializerCtor, opts = {}) {
  const x = await openXlsx(templateBuf, DOMParserCtor, XMLSerializerCtor), warnings = [];
  // 1) رؤوس الأشهر (من تاريخ بداية المشروع)
  const outHead = {}, wpHead = {};
  for (let i = 0; i < 12; i++) { outHead[colName(4 + i * 4) + '2'] = excelSerial(monthStart(project, i)); wpHead[colName(8 + i * 4) + '2'] = excelSerial(monthStart(project, i)); }
  await x.set('Output indicators', outHead);
  // 2) خطة العمل: صفّان لكل نشاط (مخطط/فعلي)
  const actual = workplanActual(project, db), wp = { ...wpHead };
  if (project.activities.length > 56) warnings.push('عدد الأنشطة يتجاوز سعة قالب خطة العمل (56)');
  for (let k = 0; k < 56; k++) { // تفريغ كل الصفوف أولًا (القالب يحوي أرقام عينة)
    const rp = 5 + 2 * k;
    for (const c of ['A', 'B', 'C', 'D']) wp[c + rp] = null;
    for (let w = 0; w < 48; w++) { wp[colName(8 + w) + rp] = null; wp[colName(8 + w) + (rp + 1)] = null; }
  }
  project.activities.slice(0, 56).forEach((a, k) => {
    const rp = 5 + 2 * k, ra = rp + 1, iv = project.interventions.find((i) => i.id === a.interventionId);
    wp['A' + rp] = iv?.result || ''; wp['B' + rp] = a.name; wp['C' + rp] = a.unit || 'session'; wp['D' + rp] = a.plannedSessions ?? null;
    wp['F' + rp] = 'Planned'; wp['F' + ra] = 'Actual';
    const plan = a.planWeeks || spreadPlan(a);
    for (let w = 0; w < 48; w++) { wp[colName(8 + w) + rp] = plan[w] || null; wp[colName(8 + w) + ra] = (actual.get(a.id) || [])[w] || null; }
  });
  await x.set('Project Work plan', wp);
  // 3) مؤشرات المخرجات
  const om = outputMonthly(project, db), oc = {}, used = {};
  for (const r of Object.values(OUT_SLOTS).flat()) { oc['B' + r] = null; oc['C' + r] = null; for (let i = 0; i < 48; i++) oc[colName(4 + i) + r] = null; }
  for (const o of om) {
    const slots = OUT_SLOTS[o.ind.output]; const n = (used[o.ind.output] = (used[o.ind.output] || 0) + 1);
    if (!slots || n > slots.length) { warnings.push(`المؤشر «${o.ind.name}» لا يوجد له صف في القالب (${o.ind.output})`); continue; }
    const r = slots[n - 1]; oc['B' + r] = o.ind.outputText || null; oc['C' + r] = o.ind.name;
    o.months.forEach((m, i) => CATS.forEach((c, j) => { oc[colName(4 + i * 4 + j) + r] = m[c] || null; }));
    if (o.countsModeSessions) warnings.push(`المؤشر «${o.ind.name}»: ${o.countsModeSessions} جلسة بالأعداد فقط، تُحتسب كمشاركات وليست أفرادًا فريدين`);
  }
  await x.set('Output indicators', oc);
  // 4) تفصيل المستفيدين (قاعدة البيانات 2)
  const bd = breakdown(project, db), bc = {};
  if (project.interventions.length > 5) warnings.push('عدد البنود يتجاوز 5 صفوف في تفصيل المستفيدين');
  for (let q = 1; q <= 4; q++) for (const sx of ['M', 'F']) for (let k = 0; k < 5; k++) {
    const iv = project.interventions[k], r = BD_BLOCKS[q][sx] + k;
    if (!iv) { for (const c of ['B', 'C', 'D']) bc[c + r] = null; for (let b = 0; b < 14; b++) bc[colName(MALE_COL + b) + r] = null; continue; }
    bc['B' + r] = iv.result; bc['C' + r] = iv.name; bc['D' + r] = GROUP_LABEL[iv.group] || iv.group;
    const male = bd.cells[`${q}|${iv.id}|${sx}`] || [], cwd = bd.cells[`${q}|${iv.id}|CWD_${sx}`] || [];
    for (let b = 0; b < 7; b++) { bc[colName(MALE_COL + b) + r] = male[b] || null; bc[colName(CWD_COL + b) + r] = cwd[b] || null; }
  }
  await x.set('Beneficiaries Breakdown', bc);
  const placed = Object.values(bd.cells).reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0), uq = directBeneficiaries(project, db).all.size;
  if (placed > uq) warnings.push(`قالب PTT يجمع المستفيدين ربعًا بربع، فيُكرَّر من حضر في أكثر من ربع: مجموع الأرباع في القالب ${placed}، بينما الأفراد الفريدون المسجّلون بالأسماء ${uq} (إضافة إلى المشاركين بالأعداد فقط). الرقم الفريد في لوحة النظام.`);
  if (bd.unclassified) warnings.push(`${bd.unclassified} مشارك بلا فئة عمرية لم يدخلوا في تفصيل المستفيدين`);
  // 5) مؤشرات النتائج (من الاستبيانات) إن وُجدت
  {
    const cells = {}, OUT_ROWS = [4, 5, 7, 8, 9, 10, 11, 12];
    for (const r of OUT_ROWS) { cells['B' + r] = null; for (let i = 0; i < 32; i++) cells[colName(3 + i) + r] = null; }
    for (const o of computeOutcomes(project, db)) { if (!o.ind.row || !OUT_ROWS.includes(o.ind.row)) { warnings.push(`مؤشر النتائج «${o.ind.name}»: الصف ${o.ind.row ?? '—'} غير صالح (المسموح 4،5،7–12)`); continue; }
      cells['B' + o.ind.row] = o.ind.name; for (const s of o.issues.slice(0, 3)) warnings.push(`«${o.ind.name}»: ${s}`); if (o.issues.length > 3) warnings.push(`«${o.ind.name}»: و${o.issues.length - 3} ملاحظات أخرى (انظر التحقق)`);
      o.quarters.forEach((qq, qi) => { const base = 3 + qi * 8; CATS.forEach((c, j) => { cells[colName(base + j) + o.ind.row] = qq.N[c] || null; cells[colName(base + 4 + j) + o.ind.row] = qq.D[c] || null; }); }); }
    await x.set('Outcome indicators', cells);
  }
  return { data: await x.save(), warnings };
}
const GROUP_LABEL = { child: 'Children', youth: 'Youth', parent: 'Parents', localEducator: 'Local Educator', nawaEducator: 'NAWA educators' };
function spreadPlan(a) { // يوزّع الجلسات المخططة على أشهر الخطة (a.planMonths=[من,إلى]) أسبوعيًا
  const [from, to] = a.planMonths || [0, 11], total = a.plannedSessions || 0, weeks = [], span = (to - from + 1) * 4, arr = Array(48).fill(0);
  for (let i = 0; i < total; i++) arr[from * 4 + Math.floor((i * span) / Math.max(total, 1))]++;
  return arr;
}
