import ExcelJS from 'exceljs';
import { sttRows, bttRows, dashboard } from './aggregate.js';
import { ageAt, bandOf } from './model.js';

export const BRAND = { red: 'FFA21008', gold: 'FFE6A901', pink: 'FFFF9798', tint: 'FFFFF1F1', font: 'Sakkal Majalla' };
const hdr = (ws, row) => { row.eachCell((c) => { c.font = { name: BRAND.font, bold: true, size: 13, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.red } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = { bottom: { style: 'medium', color: { argb: BRAND.gold } } }; }); row.height = 28; };
const body = (ws) => ws.eachRow((r, i) => { if (i > 1) r.eachCell((c) => { c.font = { name: BRAND.font, size: 12 }; c.alignment = { vertical: 'middle', horizontal: typeof c.value === 'number' ? 'center' : 'right' }; c.border = { bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } }; }); });
const book = () => { const wb = new ExcelJS.Workbook(); wb.creator = 'جمعية نوى للثقافة والفنون'; return wb; };
const sheet = (wb, name) => wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }], properties: { tabColor: { argb: BRAND.red } } });

export async function exportSTT(db, projectId) {
  const wb = book(), ws = sheet(wb, 'SO 1'), rows = sttRows(db, projectId);
  const cols = [['Start date', 'date', 13], ['End date', 'date', 13], ['Year', 'year', 8], ['Center', 'center', 18], ['Project', 'project', 26], ['Donor', 'donor', 14], ['Activity', 'activity', 26], ['Type', 'type', 14], ['Target Group', 'group', 14],
    ['# of Sessions', 'sessions', 10], ['Unit', 'unit', 8], ['Implemented', 'impl', 11], ['Male', 'male', 8], ['Female', 'female', 8], ['MWD', 'mwd', 8], ['FWD', 'fwd', 8], ['Total', 'total', 8], ['Animator', 'educator', 18], ['Comments', 'notes', 24]];
  ws.addRow(cols.map((c) => c[0])); hdr(ws, ws.getRow(1)); cols.forEach((c, i) => (ws.getColumn(i + 1).width = c[2]));
  for (const r of rows) { const n = ws.rowCount + 1;
    ws.addRow([new Date(r.date + 'T00:00:00Z'), new Date((r.endDate || r.date) + 'T00:00:00Z'), Number(r.year), r.center, r.project, r.donor, r.activity, r.type, r.group, r.sessions, 'Session', r.sessions, r.male, r.female, r.mwd, r.fwd, { formula: `SUM(M${n}:P${n})`, result: r.total }, r.educator, r.notes]);
    ws.getCell(`A${n}`).numFmt = ws.getCell(`B${n}`).numFmt = 'dd/mm/yyyy'; }
  body(ws); ws.autoFilter = { from: 'A1', to: `S1` };
  return wb.xlsx.writeBuffer();
}

export async function exportBTT(db, projectId) {
  const wb = book(), ws = sheet(wb, 'المستفيدون'), rows = bttRows(db, projectId);
  const acts = db.projects.filter((p) => !projectId || p.id === projectId).flatMap((p) => p.activities);
  const head = ['الرمز', 'الاسم', 'العمر', 'الفئة العمرية', 'الجنس', 'إعاقة', 'نوع الإعاقة', 'تاريخ الميلاد', 'الهاتف', 'الحالة', 'مشاركة سابقة', ...acts.map((a) => a.name), 'إجمالي الجلسات'];
  ws.addRow(head); hdr(ws, ws.getRow(1)); ws.getColumn(2).width = 30; [1, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach((i) => (ws.getColumn(i).width = 13));
  const a0 = 12;
  for (const b of rows) { const age = ageAt(b, new Date().toISOString().slice(0, 10)), n = ws.rowCount + 1;
    ws.addRow([b.id, b.name, age, bandOf(age)?.key || '', b.sex === 'M' ? 'ذكر' : 'أنثى', b.disability ? 'نعم' : 'لا', b.disabilityType || '', b.dob ? new Date(b.dob + 'T00:00:00Z') : null, b.phone || '', b.status || '', b.previous || '', ...acts.map((a) => b.attendance[a.id] || null),
      { formula: `SUM(${colL(a0)}${n}:${colL(a0 + acts.length - 1)}${n})`, result: b.totalSessions }]); }
  body(ws); return wb.xlsx.writeBuffer();
}
const colL = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// ملخص لوحة القيادة كملف Excel بتنسيق نوى
export async function exportSummary(db, project) {
  const d = dashboard(project, db), wb = book(), ws = wb.addWorksheet('ملخص', { views: [{ rightToLeft: true }] });
  ws.addRow([project.name]).font = { name: BRAND.font, size: 18, bold: true, color: { argb: BRAND.red } };
  ws.addRow(['الجلسات', d.sessions]); ws.addRow(['إجمالي الحضور', d.attendance]); ws.addRow(['المستفيدون المباشرون', d.directCount]); ws.addRow(['أفراد فريدون (بكشف الأسماء)', d.uniqueRolled]); ws.addRow([]);
  ws.addRow(['النشاط', 'جلسات منفذة', 'جلسات مخططة', 'الحضور']); hdr(ws, ws.getRow(ws.rowCount));
  for (const [k, v] of Object.entries(d.byAct)) ws.addRow([k, v.sessions, v.planned, v.att]);
  ws.getColumn(1).width = 34; for (const c of [2, 3, 4]) ws.getColumn(c).width = 16;
  ws.eachRow((r) => r.eachCell((c) => { c.font = { ...(c.font || {}), name: BRAND.font }; }));
  return wb.xlsx.writeBuffer();
}
