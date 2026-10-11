import test from 'node:test'; import assert from 'node:assert/strict';
import { newDb, uid } from '../core/model.js';
import { KINDS, newSheet, validateSheet, derivedCounts, completion, commitSheet, sheetSessions, removeSheet } from '../core/sheets.js';
import { validateEntry, reconcile } from '../core/validate.js';

function base() {
  const db = newDb(); db.centers = [{ id: 'c1', name: 'المركز' }];
  db.projects = [{ id: 'p1', name: 'م', start: '2026-07-01', end: '2027-03-31', interventions: [{ id: 'i1', result: 'R1', name: 'بند', group: 'child' }], activities: [{ id: 'a1', name: 'قصص', type: 'Psychosocial', interventionId: 'i1', group: 'child', ageMin: 4, ageMax: 15 }], outputIndicators: [], outcomeIndicators: [] }];
  const mk = (n, sex, age, dis, dt, phone) => { const b = { id: uid('b'), name: n, sex, age, disability: !!dis, disabilityType: dt || '', phone: phone || '' }; db.beneficiaries.push(b); return b.id; };
  return { db, mk };
}
const course = (db, ids) => { const sh = newSheet('course', 'p1', 'c1'); sh.activityId = 'a1'; sh.roster = ids; sh.meta = { title: 'قصص الشفاء', type: 'فنية', facilitator: 'سناء الأسطل', start: '2026-07-05', end: '2026-08-30', hours: 6, meetings: 4, from: '09:00', to: '10:30', mode: 'inperson', venue: 'القاعة 1', mandatoryPct: 75, groups: ['c712'] };
  sh.meetings = [{ n: 1, date: '2026-07-05', present: ids.slice(0, 3) }, { n: 2, date: '2026-07-12', present: ids.slice(0, 2) }, { n: 3, date: '', present: [] }, { n: 4, date: '', present: [] }]; return sh; };

test('كشف دورة صحيح: بلا أخطاء، والأعداد المشتقة تُحسب من القائمة لا من الإدخال', () => {
  const { db, mk } = base(); const ids = [mk('أحمد محمد علي سالم', 'M', 8), mk('سلمى خالد يوسف عطية', 'F', 9), mk('عمر سامي رامي حمدان', 'M', 10, true, 'حركية')];
  const sh = course(db, ids), r = validateSheet(sh, db, { today: '2026-10-01' });
  assert.deepEqual(r.errors, []); const d = derivedCounts(sh, db); assert.deepEqual([d.total, d.M, d.F, d.MWD, d.FWD], [3, 2, 1, 1, 0]); assert.deepEqual(d.types, { حركية: 1 });
  const c = completion(sh, db); assert.deepEqual(c.map((x) => x.pct), [100, 100, 50]); assert.deepEqual(c.map((x) => x.ok), [true, true, false]);
});

test('الكشف يمنع الأخطاء الميدانية الشائعة', () => {
  const { db, mk } = base(); const ok = mk('أحمد محمد علي سالم', 'M', 8), old = mk('خالد سامي رامي حمدان', 'M', 14), dis = mk('منى هدى رنا الغول', 'F', 9, true, ''), short = mk('ليلى منى', 'F', 9), noPhone = mk('رهف أحمد سمير النجار', 'F', 9, false, '', '12345');
  const sh = course(db, [ok, old, dis, short, noPhone]); const has = (r, t) => r.errors.some((e) => e.includes(t)), hasW = (r, t) => r.warnings.some((e) => e.includes(t));
  let r = validateSheet(sh, db, { today: '2026-10-01' });
  assert.ok(has(r, 'خارج الفئات المختارة'), 'عمر 14 خارج 7-12'); assert.ok(has(r, 'إعاقة بلا تحديد النوع')); assert.ok(has(r, 'أقل من ثلاثة مقاطع')); assert.ok(hasW(r, 'رقم هاتف غير صالح'));
  sh.meta.to = '09:00'; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'وقت النهاية'));
  sh.meta.to = '10:30'; sh.meta.end = '2026-06-01'; r = validateSheet(sh, db, { today: '2026-10-01' }); assert.ok(has(r, 'تاريخ الانتهاء قبل') && has(r, 'خارج مدة المشروع'));
  sh.meta.end = '2026-08-30'; sh.meetings[1].date = sh.meetings[0].date; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'مكرر'));
  sh.meetings[1].date = '2026-12-12'; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'مستقبلي'));
  sh.meetings[1].date = '2026-07-12'; sh.meta.meetings = 1; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'أكثر من الإجمالي'));
  sh.meta.meetings = 4; sh.meta.mandatoryPct = 150; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'نسبة الحضور الإلزامية'));
  sh.meta.mandatoryPct = 75; sh.meta.mode = 'online'; sh.meta.venue = ''; assert.ok(has(validateSheet(sh, db, { today: '2026-10-01' }), 'المنصة'));
  const e = newSheet('course', 'p1', 'c1'); assert.ok(validateSheet(e, db).errors.length > 8, 'كشف فارغ يُرفض');
});

test('الحفظ يولّد جلسات STT متسقة مع كل المحركات، والحذف يزيلها', () => {
  const { db, mk } = base(); const ids = [mk('أحمد محمد علي سالم', 'M', 8), mk('سلمى خالد يوسف عطية', 'F', 9), mk('عمر سامي رامي حمدان', 'M', 10)];
  const sh = course(db, ids); commitSheet(db, sh); const ss = db.sessions.filter((s) => s.sheetId === sh.id);
  assert.equal(ss.length, 2); assert.deepEqual(ss.map((s) => s.attendance.length), [3, 2]); assert.equal(ss[0].from, '09:00');
  assert.deepEqual(reconcile(db).filter((i) => i.level === 'error'), []); assert.deepEqual(validateEntry(db).filter((i) => i.level === 'error'), []);
  sh.meetings[1].present = ids.slice(0, 1); commitSheet(db, sh); assert.equal(db.sessions.filter((s) => s.sheetId === sh.id).length, 2); assert.equal(db.sessions.find((s) => s.meeting === 2).attendance.length, 1);
  removeSheet(db, sh.id); assert.equal(db.sessions.length, 0); assert.equal(db.sheets.length, 0);
});

test('ازدواج الحضور في الوقت نفسه يُنبَّه إليه', () => {
  const { db, mk } = base(); const ids = [mk('أحمد محمد علي سالم', 'M', 8), mk('سلمى خالد يوسف عطية', 'F', 9)];
  const a = course(db, ids); commitSheet(db, a);
  const b = course(db, ids); b.meta.title = 'أخرى'; b.meta.from = '10:00'; b.meta.to = '11:00'; const r = validateSheet(b, db, { today: '2026-10-01' });
  assert.ok(r.warnings.some((w) => w.includes('جلسة أخرى بالتوقيت نفسه')));
  b.meta.from = '11:00'; b.meta.to = '12:00'; assert.ok(!validateSheet(b, db, { today: '2026-10-01' }).warnings.some((w) => w.includes('بالتوقيت نفسه')));
});

test('الكشوف الأحادية: نشاط مشترك (أهالي + أطفال) وزيارة بزوار مضمَّنين', () => {
  const { db, mk } = base(); const kid = mk('أحمد محمد علي سالم', 'M', 8), par = mk('هدى أحمد سمير النجار', 'F', 35);
  const j = newSheet('joint', 'p1', 'c1'); j.activityId = 'a1'; j.roster = [kid]; j.rosterP = [par]; j.meta = { title: 'قصة مشتركة', type: 'ثقافي', facilitator: 'سناء الأسطل', date: '2026-08-02', from: '09:00', to: '10:00', mode: 'inperson', venue: 'القاعة', groups: ['c712', 'parents'] };
  assert.deepEqual(validateSheet(j, db, { today: '2026-10-01' }).errors, []); commitSheet(db, j); assert.equal(db.sessions[0].attendance.length, 2);
  j.meta.groups = ['c712']; assert.ok(validateSheet(j, db, { today: '2026-10-01' }).errors.some((e) => e.includes('الأهالي')));
  const v = newSheet('visit', 'p1', 'c1'); v.activityId = 'a1'; v.guests = [{ name: 'زائر أول ثالث رابع', sex: 'M', age: 8 }, { name: 'زائرة أولى ثالثة رابعة', sex: 'F', age: 9, disability: true, dtype: 'سمعية' }, { name: 'زائرة ثانية ثالثة رابعة', sex: 'F', age: 12 }];
  v.meta = { activities: ['رسم'], facilitators: ['سناء'], date: '2026-08-03', from: '09:00', to: '10:00', type: 'مدرسية', venue: 'القاعة', body: 'مدرسة الأمل', contact: 'أ. محمد', contactPhone: '0599123456', groups: ['c712'] };
  assert.deepEqual(validateSheet(v, db, { today: '2026-10-01' }).errors, []); const [s] = sheetSessions(v, db); assert.deepEqual(s.counts, { M: 1, F: 1, MWD: 0, FWD: 1 }); commitSheet(db, v);
  assert.deepEqual(reconcile(db).filter((i) => i.level === 'error'), []); assert.deepEqual(validateEntry(db).filter((i) => i.level === 'error'), []);
  v.meta.contactPhone = '123'; assert.ok(validateSheet(v, db, { today: '2026-10-01' }).errors.some((e) => e.includes('رقم التواصل')));
  assert.equal(Object.keys(KINDS).length, 8);
});
