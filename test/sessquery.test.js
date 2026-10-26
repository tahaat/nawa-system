import test from 'node:test'; import assert from 'node:assert/strict';
import { context } from '../core/aggregate.js'; import { filterSessions, summarize, uniqueReach, emptyF, isActiveF } from '../core/sessquery.js'; import { tiny } from './fixture.js'; import { newDb } from '../core/model.js';
const mk = () => { const db = Object.assign(newDb(), tiny()); return { db, cx: context(db) }; };
test('فلتر الجلسات: تاريخ/نشاط/مركز/نمط/حالة/نص', () => {
  const { db, cx } = mk(); const all = db.sessions; assert.ok(all.length >= 5);
  assert.equal(filterSessions(all, emptyF(), cx).length, all.length); assert.ok(!isActiveF(emptyF()));
  const d = all.map((s) => s.date).sort(); const mid = d[Math.floor(d.length / 2)];
  assert.ok(filterSessions(all, { ...emptyF(), from: mid }, cx).every((s) => s.date >= mid)); assert.ok(filterSessions(all, { ...emptyF(), to: mid }, cx).every((s) => s.date <= mid));
  const c1 = all[0].centerId; assert.ok(filterSessions(all, { ...emptyF(), center: c1 }, cx).every((s) => s.centerId === c1));
  const a1 = all[0].activityId; assert.ok(filterSessions(all, { ...emptyF(), act: a1 }, cx).every((s) => s.activityId === a1));
  assert.ok(filterSessions(all, { ...emptyF(), mode: 'roll' }, cx).every((s) => s.mode === 'roll'));
  const bad = new Set([all[0].id]); const lv = (s) => (bad.has(s.id) ? 'error' : 'ok');
  assert.deepEqual(filterSessions(all, { ...emptyF(), status: 'error' }, cx, lv).map((s) => s.id), [all[0].id]); assert.equal(filterSessions(all, { ...emptyF(), status: 'ok' }, cx, lv).length, all.length - 1);
  const ed = all[0].educator; assert.ok(filterSessions(all, { ...emptyF(), edu: ed.slice(0, 2) }, cx).some((s) => s.id === all[0].id));
  assert.equal(filterSessions(all, { ...emptyF(), q: 'لا-يوجد-هذا-النص' }, cx).length, 0);
});
test('بلا تكرار: الشخص مرة واحدة داخل النشاط ومرة في الإجمالي', () => {
  const { db, cx } = mk(); const b = db.beneficiaries.map((x) => x.id); const p = db.projects[0], acts = p.activities.filter((a) => !a.ops), c = db.centers[0].id;
  db.sessions = [
    { id: 'u1', projectId: p.id, activityId: acts[0].id, centerId: c, date: '2026-03-01', mode: 'roll', attendance: [b[0], b[1]], units: 1 },
    { id: 'u2', projectId: p.id, activityId: acts[0].id, centerId: c, date: '2026-03-08', mode: 'roll', attendance: [b[0], b[2]], units: 1 },
    { id: 'u3', projectId: p.id, activityId: acts[1].id, centerId: c, date: '2026-03-09', mode: 'roll', attendance: [b[0]], units: 1 },
    { id: 'u4', projectId: p.id, activityId: acts[1].id, centerId: c, date: '2026-05-01', mode: 'counts', counts: { M: 4, F: 3, MWD: 0, FWD: 0 }, units: 1 },
  ]; const cx2 = context(db);
  let r = uniqueReach(db, cx2, { from: '2026-03-01', to: '2026-03-31' }, 'act');
  const a0 = r.rows.find((x) => x.key === acts[0].id), a1 = r.rows.find((x) => x.key === acts[1].id);
  assert.equal(a0.unique, 3); assert.equal(a0.instances, 4); assert.equal(a0.sessions, 2); assert.equal(a1.unique, 1);
  assert.equal(r.total.unique, 3);   // b0 في نشاطين لكنه يُحسب مرة واحدة في الإجمالي
  r = uniqueReach(db, cx2, {}, 'act'); assert.equal(r.rows.find((x) => x.key === acts[1].id).blind, 7);   // جلسة الأعداد منفصلة
  r = uniqueReach(db, cx2, { act: acts[0].id }, 'center'); assert.equal(r.rows.length, 1); assert.equal(r.rows[0].unique, 3);
  r = uniqueReach(db, cx2, { projectId: p.id }, 'project'); assert.equal(r.rows[0].unique, 3);
  r = uniqueReach(db, cx2, { from: '2027-01-01' }, 'act'); assert.equal(r.total.unique, 0); assert.equal(r.rows.length, 0);
  const s = summarize(db.sessions, cx2); assert.equal(s.sessions, 4); assert.equal(s.unique, 3); assert.equal(s.blind, 7);
});
test('بلا تكرار حسب تعريف المستفيد المباشر لكل مشروع (حد أدنى للجلسات)', () => {
  const { db } = mk(); const b = db.beneficiaries.map((x) => x.id); const p = db.projects[0], a = p.activities.filter((x) => !x.ops)[0], c = db.centers[0].id;
  db.enrollments = []; db.sessions = [
    { id: 'r1', projectId: p.id, activityId: a.id, centerId: c, date: '2026-03-01', mode: 'roll', attendance: [b[0], b[1]], units: 1 },
    { id: 'r2', projectId: p.id, activityId: a.id, centerId: c, date: '2026-03-08', mode: 'roll', attendance: [b[0]], units: 1 },
  ];
  p.directRule = { mode: 'once' }; assert.equal(uniqueReach(db, context(db), { byRule: true }, 'project').total.unique, 2);
  p.directRule = { mode: 'threshold', minSessions: 2, minPct: 0 }; assert.equal(uniqueReach(db, context(db), { byRule: true }, 'project').total.unique, 1);
  assert.equal(uniqueReach(db, context(db), {}, 'project').total.unique, 2);   // بلا تفعيل القاعدة: أي حضور
});
