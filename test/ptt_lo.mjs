// تحقق مستقل: نصدّر PTT ببيانات كبيرة، ونعيد حسابه بـ LibreOffice، ثم نقارن خلايا القالب المحسوبة بالأرقام المتوقعة
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import ExcelJS from 'exceljs'; import { big } from './fixture.js'; import { exportPTT } from '../core/ptt-export.js';
import { outputMonthly, breakdown, workplanActual } from '../core/aggregate.js'; import { CATS } from '../core/model.js';
const db = big(), p = db.projects[0];
const { data } = await exportPTT(fs.readFileSync('assets/ptt.xlsx'), p, db, DOMParser, XMLSerializer);
fs.mkdirSync('out/lo2', { recursive: true }); fs.writeFileSync('out/big_ptt.xlsx', data);
execSync('soffice --headless --convert-to xlsx --outdir out/lo2 out/big_ptt.xlsx', { stdio: 'ignore' });
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile('out/lo2/big_ptt.xlsx');
const val = (ws, r, c) => { const v = ws.getCell(r, c).value; return typeof v === 'object' && v ? (v.result ?? 0) : (v ?? 0); };
let bad = 0; let nz = 0; const chk = (name, a, b) => { if (b) nz++; if (a !== b) { bad++; console.log('✗', name, 'قالب=', a, 'متوقع=', b); } };
// المخرجات: إجماليات AZ..BC (52..55)
const ow = wb.getWorksheet('Output indicators'), om = outputMonthly(p, db), slots = { 'output 1': [4, 5, 6], 'output 2': [7, 8, 9, 10] }, used = {};
for (const o of om) { const n = (used[o.ind.output] = (used[o.ind.output] || 0) + 1), r = slots[o.ind.output][n - 1]; CATS.forEach((c, j) => chk(`${o.ind.name} ${c}`, val(ow, r, 52 + j), o.months.reduce((a, m) => a + m[c], 0))); }
// تفصيل المستفيدين: S/T لكل ربع (Males رقم الصف 48/65/82/99، Females 56/73/90/107)
const bw = wb.getWorksheet('Beneficiaries Breakdown'), bd = breakdown(p, db); const totRows = { 1: { M: 48, F: 56 }, 2: { M: 65, F: 73 }, 3: { M: 82, F: 90 }, 4: { M: 99, F: 107 } };
for (let q = 1; q <= 4; q++) for (const sx of ['M', 'F']) { let a = 0, c = 0; for (const iv of p.interventions) { a += (bd.cells[`${q}|${iv.id}|${sx}`] || []).reduce((x, y) => x + y, 0); c += (bd.cells[`${q}|${iv.id}|CWD_${sx}`] || []).reduce((x, y) => x + y, 0); } chk(`Q${q}${sx} S`, val(bw, totRows[q][sx], 19), a); chk(`Q${q}${sx} T`, val(bw, totRows[q][sx], 20), c); }
// خطة العمل: BD = مجموع الأسابيع
const ww = wb.getWorksheet('Project Work plan'), wa = workplanActual(p, db);
p.activities.forEach((a, k) => chk(`فعلي ${a.name}`, val(ww, 6 + 2 * k, 56), (wa.get(a.id) || []).reduce((x, y) => x + y, 0)));
console.log('عدد المقارنات غير الصفرية:', nz); console.log(bad ? `فشل: ${bad}` : 'كل خلايا القالب المحسوبة تطابق المحرك ✔');
process.exit(bad ? 1 : 0);
