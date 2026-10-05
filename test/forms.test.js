import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { TEMPLATES, buildForm, xlsformBuffer } from '../core/forms.js';
test('كل القوالب تمرّ على pyxform الرسمي (متوافقة مع KoBo)', async () => {
  fs.mkdirSync('out/forms', { recursive: true });
  for (const t of TEMPLATES) {
    const f = buildForm(t, { projectId: 'p1', centers: [{ id: 'c1', name: 'مكتبة الخضر' }] });
    const names = f.survey.map((r) => r.name).filter(Boolean); assert.equal(new Set(names.filter((n) => !n.startsWith('g_'))).size, names.filter((n) => !n.startsWith('g_')).length);
    const p = `out/forms/${t.id}.xlsx`; fs.writeFileSync(p, Buffer.from(await xlsformBuffer(f)));
    const out = execFileSync('python3', ['-m', 'pyxform.xls2xform', p, `out/forms/${t.id}.xml`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.ok(fs.statSync(`out/forms/${t.id}.xml`).size > 1000, t.id);
  }
});

import { importResponses, computeOutcomes } from '../core/outcomes.js'; import { tiny } from './fixture.js';
test('استيراد ردود KoBo وحساب مؤشرات النتائج بأرقام معروفة', () => {
  const db = tiny(), p = db.projects[0];
  const mk = (id, round, date, score, uuid) => ({ 'g_id/bnf_id': id, 'g_id/round': round, 'g_id/visit_date': date, score_total: score, score_max: 30, _uuid: uuid });
  const rows = [mk('b1', 'baseline', '2026-01-10', 12, 'u1'), mk('b1', 'endline', '2026-05-10', 24, 'u2'), mk('b2', 'baseline', '2026-01-10', 20, 'u3'), mk('b2', 'endline', '2026-05-11', 18, 'u4'),
    mk('b3', 'baseline', '2026-01-12', 10, 'u5'), mk('b3', 'endline', '2026-05-12', 22, 'u6'), mk('zzz', 'endline', '2026-05-12', 30, 'u7'), mk('b1', 'endline', '2026-05-10', 24, 'u2')];
  const r = importResponses(db, rows, 'child_wellbeing'); assert.deepEqual(r, { added: 8 - 1, dup: 1, noId: 0 });
  p.outcomeIndicators = [
    { id: 'x1', row: 7, name: '≥70% من الدرجة', formId: 'child_wellbeing', kind: 'threshold', op: '>=', valuePct: 70, round: 'endline' },
    { id: 'x2', row: 8, name: 'تحسّن', formId: 'child_wellbeing', kind: 'improvement', minGain: 1 }];
  const [t, im] = computeOutcomes(p, db);
  // endline: b1=24(80%)✓ M ، b2=18(60%)✗ F ، b3=22(73%)✓ CWD_M ، zzz غير موجود
  assert.deepEqual(t.quarters[1].N, { M: 1, F: 0, CWD_M: 1, CWD_F: 0 }); assert.deepEqual(t.quarters[1].D, { M: 1, F: 1, CWD_M: 1, CWD_F: 0 });
  assert.ok(t.issues.some((x) => x.includes('zzz')));
  // تحسّن: b1 ✓ (+12) ، b2 ✗ (−2) ، b3 ✓ (+12)
  assert.deepEqual(im.quarters[1].N, { M: 1, F: 0, CWD_M: 1, CWD_F: 0 }); assert.deepEqual(im.quarters[1].D, { M: 1, F: 1, CWD_M: 1, CWD_F: 0 });
});

import { DOMParser, XMLSerializer } from '@xmldom/xmldom'; import ExcelJS from 'exceljs'; import { exportPTT } from '../core/ptt-export.js'; import { execSync } from 'node:child_process';
test('مؤشرات النتائج تصل إلى ورقة Outcome indicators وتُحسب النسب فيها', async () => {
  const db = tiny(), p = db.projects[0]; const mk = (id, round, date, score) => ({ bnf_id: id, round, visit_date: date, score_total: score, score_max: 30 });
  importResponses(db, [mk('b1', 'endline', '2026-05-10', 24), mk('b2', 'endline', '2026-05-11', 18), mk('b3', 'endline', '2026-05-12', 22), mk('b4', 'endline', '2026-08-01', 28)], 'child_wellbeing');
  p.outcomeIndicators = [{ id: 'x1', row: 7, name: 'نسبة ≥70%', formId: 'child_wellbeing', kind: 'threshold', valuePct: 70, round: 'endline' }];
  const { data } = await exportPTT(fs.readFileSync('assets/ptt.xlsx'), p, db, DOMParser, XMLSerializer); fs.writeFileSync('out/outc.xlsx', data);
  execSync('soffice --headless --convert-to xlsx --outdir out/lo3 out/outc.xlsx', { stdio: 'ignore' });
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile('out/lo3/outc.xlsx'); const w = wb.getWorksheet('Outcome indicators'); const v = (a) => { const x = w.getCell(a).value; return x && typeof x === 'object' ? x.result : x; };
  const txt = (a) => { const x = w.getCell(a).value; return x?.richText ? x.richText.map((r) => r.text).join('') : x; };
  assert.equal(txt('B7'), 'نسبة ≥70%');
  // ر2: ذكور 1/1 ، إناث 0/1 ، ذكور-إعاقة 1/1
  assert.equal(v('K7'), 1); assert.equal(v('M7'), 1); assert.equal(v('O7'), 1); assert.equal(v('P7'), 1); assert.equal(v('Q7'), 1); assert.equal(v('L7') ?? 0, 0);
  // ر3: أنثى ✓ 1/1
  assert.equal(v('T7'), 1); assert.equal(v('X7'), 1);
  // النسب السنوية المحسوبة بمعادلات القالب
  assert.equal(v('AI7'), 1); assert.equal(v('AJ7'), 0.5); assert.equal(v('AK7'), 1);
});
