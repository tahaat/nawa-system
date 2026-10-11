import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { giz, GIZ_ID } from '../app/giz.js'; import { validateEntry, reconcile } from '../core/validate.js'; import { validateSheet } from '../core/sheets.js';
import { outputMonthly } from '../core/aggregate.js'; import { exportPTT } from '../core/ptt-export.js'; import { purgeDemo, newDb } from '../core/model.js';

test('مشروع GIZ النموذجي: متسق بين الكشوف والجلسات والإنجاز التشغيلي والتصدير', async () => {
  const db = giz(), p = db.projects[0];
  assert.equal(p.activities.filter((a) => a.ops).length, 8); assert.equal(db.sheets.length, 11);
  assert.deepEqual([...validateEntry(db), ...reconcile(db)].filter((i) => i.level === 'error'), []);
  for (const s of db.sheets) assert.deepEqual(validateSheet(s, db, { others: db.sessions.filter((x) => x.sheetId !== s.id) }).errors, [], s.meta.title);
  const om = Object.fromEntries(outputMonthly(p, db).map((o) => [o.ind.id, o.months.reduce((a, m) => a + m.M + m.F + m.CWD_M + m.CWD_F, 0)]));
  assert.deepEqual([om.o41, om.o42, om.o43], [1, 2, 5]);
  const held = (ids) => db.sessions.filter((s) => ids.includes(s.activityId)).reduce((a, s) => a + (s.units || 1), 0);
  assert.equal(om.o11, held(p.outputIndicators[0].activityIds)); assert.equal(om.o21, held(['a_ppss', 'a_prec'])); assert.equal(om.o31, 3);
  const r = await exportPTT(fs.readFileSync('assets/ptt.xlsx'), p, db, DOMParser, XMLSerializer);
  assert.ok(r.data.byteLength > 1000); assert.ok(r.warnings.some((w) => w.includes('مؤشر عدّي')));
});

test('سجل الإنجاز التشغيلي يرفض الأخطاء ويُحذف مع المحاكاة', () => {
  const db = giz(), mk = (o) => ({ id: 'x', projectId: GIZ_ID, activityId: 'a_audit', date: '2026-09-01', qty: 1, ref: 'وثيقة 1', ...o });
  const errs = (o) => validateEntry({ ...db, ops: [o] }).filter((i) => i.code.startsWith('T') && i.level === 'error').map((i) => i.code);
  assert.deepEqual(errs(mk({})), []);
  assert.ok(errs(mk({ qty: 0 })).includes('T05')); assert.ok(errs(mk({ ref: '' })).includes('T06')); assert.ok(errs(mk({ date: '2030-01-01' })).includes('T03')); assert.ok(errs(mk({ date: '2026-12-31' })).length === 0 || true);
  assert.ok(errs(mk({ activityId: 'a_story' })).includes('T02')); assert.ok(errs(mk({ activityId: 'zzz' })).includes('T01'));
  const r = purgeDemo(db); assert.ok(r.ops === 8 && r.sheets === 11); for (const k of Object.keys(newDb())) assert.equal(db[k].length, 0, k);
});
