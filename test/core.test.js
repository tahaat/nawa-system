import test from 'node:test'; import assert from 'node:assert/strict';
import { tiny, big } from './fixture.js';
import { outputMonthly, breakdown, directBeneficiaries, sttRows, bttRows, workplanActual, dashboard } from '../core/aggregate.js';
import { reconcile, validateEntry } from '../core/validate.js';

test('أرقام يدوية معروفة: المخرجات الشهرية', () => {
  const db = tiny(), [o1, o2] = outputMonthly(db.projects[0], db);
  assert.deepEqual(o1.months[0], { M: 1, F: 1, CWD_M: 1, CWD_F: 0 });   // يناير: b1,b2,b3
  assert.deepEqual(o1.months[1], { M: 1, F: 1, CWD_M: 0, CWD_F: 0 });   // فبراير
  assert.deepEqual(o1.months[3], { M: 1, F: 0, CWD_M: 0, CWD_F: 0 });   // أبريل
  assert.equal(o2.months[0].F, 2); assert.equal(o2.months[1].F, 3); assert.equal(o2.months[1].CWD_F, 1);
});
test('تفصيل المستفيدين: فريد لكل ربع وبند وفئة عمرية', () => {
  const db = tiny(), bd = breakdown(db.projects[0], db);
  assert.deepEqual(bd.cells['1|i1|M'], [0, 1, 0, 0, 0, 0, 0]);       // أحمد 8 سنوات (7-10) مرة واحدة رغم جلستين
  assert.deepEqual(bd.cells['1|i1|CWD_M'], [0, 0, 1, 0, 0, 0, 0]);   // يوسف 12
  assert.deepEqual(bd.cells['2|i1|M'], [0, 1, 0, 0, 0, 0, 0]);       // أحمد في الربع الثاني يُحتسب من جديد
  assert.equal(bd.unclassified, 4);                                    // جلسة الأعداد s6 بلا توزيع
});
test('تعريف المستفيد المباشر', () => {
  const db = tiny(), p = db.projects[0];
  assert.equal(directBeneficiaries(p, db).direct.size, 5);
  p.directRule = { mode: 'threshold', minSessions: 3 };
  assert.deepEqual([...directBeneficiaries(p, db).direct], ['b1']); // أحمد حضر 1+1+2=4 وحدات
  p.directRule = { mode: 'threshold', minSessions: 1, minPct: 50 };
  assert.ok(!directBeneficiaries(p, db).direct.has('b3'));
  p.directRule = { mode: 'manual' }; db.enrollments = [{ projectId: 'p1', beneficiaryId: 'b2', direct: true }];
  assert.deepEqual([...directBeneficiaries(p, db).direct], ['b2']);
});
test('STT/BTT/خطة العمل', () => {
  const db = tiny(), stt = sttRows(db);
  assert.equal(stt.length, 6); assert.equal(stt.find((r) => r.id === 's5').total, 5);
  const b1 = bttRows(db, 'p1').find((b) => b.id === 'b1'); assert.equal(b1.attendance.a1, 4);
  const wp = workplanActual(db.projects[0], db).get('a1'); assert.equal(wp[0], 1); assert.equal(wp[(3 * 4) + 2], 2); // 20 أبريل = الأسبوع 3
});
test('بيانات سليمة ⇒ لا أخطاء تكامل', () => {
  for (const db of [tiny(), big()]) { const e = reconcile(db).filter((x) => x.level === 'error'); assert.deepEqual(e, []); }
  assert.deepEqual(validateEntry(tiny()).filter((x) => x.level === 'error'), []);
});
test('أعطال مُدخَلة عمدًا يجب أن تُكتشف', () => {
  const db = tiny();
  db.sessions[0].attendance.push('b1', 'ghost');                          // تكرار + غير موجود
  db.sessions.push({ id: 'sx', projectId: 'p1', activityId: 'a1', centerId: 'cZ', date: '2027-05-01', mode: 'counts', counts: { M: 0, F: 0 } });
  db.sessions[5].bandCounts = { M: [1, 0, 0, 0, 0, 0, 0], F: [0, 0, 0, 0, 0, 0, 0] };
  const codes = validateEntry(db).map((x) => x.code);
  for (const c of ['S05', 'S06', 'S02', 'S03', 'S12', 'S11']) assert.ok(codes.includes(c), c);
});
test('لوحة القيادة متسقة مع STT', () => {
  const db = big(), d = dashboard(db.projects[0], db), stt = sttRows(db);
  assert.equal(d.attendance, stt.reduce((a, r) => a + r.total, 0));
  assert.equal(d.sessions, 160);
});
