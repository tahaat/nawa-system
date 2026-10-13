import test from 'node:test'; import assert from 'node:assert/strict';
import { newDb } from '../core/model.js';
import { newSheet } from '../core/sheets.js';
import { ensureEnrollment, endEnrollment, reactivate, backfillEnrollments, projectsOf, enrolledIn, enrId } from '../core/enroll.js';

test('الانتماء متعدد المشاريع، والإنهاء يُبقي السجل ولا يعيده الاستنتاج التلقائي', () => {
  const db = newDb(); db.beneficiaries = [{ id: 'b1', name: 'أ' }, { id: 'b2', name: 'ب' }];
  assert.ok(ensureEnrollment(db, 'b1', 'p1')); assert.ok(ensureEnrollment(db, 'b1', 'p2')); assert.ok(!ensureEnrollment(db, 'b1', 'p1'));
  assert.deepEqual(projectsOf(db, 'b1').sort(), ['p1', 'p2']); assert.equal(db.enrollments[0].id, enrId('b1', 'p1'));
  endEnrollment(db, 'b1', 'p1', '2026-09-01'); assert.deepEqual(projectsOf(db, 'b1'), ['p2']); assert.equal(db.enrollments.length, 2);
  assert.ok(!ensureEnrollment(db, 'b1', 'p1')); assert.deepEqual(projectsOf(db, 'b1'), ['p2']);
  reactivate(db, 'b1', 'p1'); assert.deepEqual(projectsOf(db, 'b1').sort(), ['p1', 'p2']); assert.ok(enrolledIn(db, 'p2').has('b1'));
});

test('الاستنتاج من الجلسات والكشوفات والاستبيانات يملأ الانتماءات الناقصة دون تكرار', () => {
  const db = newDb(); db.beneficiaries = ['b1', 'b2', 'b3', 'b4'].map((id) => ({ id, name: id }));
  db.sessions = [{ id: 's1', projectId: 'p1', centerId: 'c1', attendance: ['b1'] }];
  const sh = newSheet('course', 'p2', 'c1'); sh.roster = ['b2']; db.sheets = [sh];
  db.surveyResponses = [{ id: 'r1', bnfId: 'b3', projectId: 'p1' }, { id: 'r2', bnfId: 'zz', projectId: 'p1' }];
  assert.equal(backfillEnrollments(db), 3); assert.equal(backfillEnrollments(db), 0);
  assert.deepEqual(projectsOf(db, 'b2'), ['p2']); assert.deepEqual(projectsOf(db, 'b4'), []);
});
