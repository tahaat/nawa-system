import { newDb } from '../core/model.js';
// بيانات تجريبية جديدة بالكامل (ليست من الملفات القديمة)
export function tiny() {
  const db = newDb();
  db.centers = [{ id: 'c1', name: 'مكتبة الخضر' }, { id: 'c2', name: 'حدائق نوى' }];
  const p = { id: 'p1', name: 'مشروع تجريبي', donor: 'ممول س', start: '2026-01-01', end: '2026-12-31', directRule: { mode: 'once' },
    interventions: [{ id: 'i1', result: 'R1', name: 'تدخلات المكتبة', group: 'child' }, { id: 'i2', result: 'R3', name: 'أنشطة الأهالي', group: 'parent' }],
    activities: [
      { id: 'a1', name: 'قراءة', type: 'Library', interventionId: 'i1', group: 'child', ageMin: 4, ageMax: 15, plannedSessions: 10 },
      { id: 'a2', name: 'رعاية ذاتية', type: 'Parents', interventionId: 'i2', group: 'parent', ageMin: 19, ageMax: 60, plannedSessions: 4 }],
    outputIndicators: [{ id: 'o1', output: 'output 1', name: 'أطفال المكتبة', activityIds: ['a1'], measure: 'unique' },
      { id: 'o2', output: 'output 2', name: 'حضور الأهالي', activityIds: ['a2'], measure: 'sessions-attendance' }] };
  db.projects = [p];
  db.beneficiaries = [
    { id: 'b1', name: 'أحمد علي محمود سالم', sex: 'M', age: 8, disability: false },
    { id: 'b2', name: 'سلمى خالد يوسف حسن', sex: 'F', age: 9, disability: false },
    { id: 'b3', name: 'يوسف عمر ناصر جابر', sex: 'M', age: 12, disability: true, disabilityType: 'حركية' },
    { id: 'b4', name: 'منى سعيد أحمد قاسم', sex: 'F', age: 30, disability: false },
    { id: 'b5', name: 'ليلى حسن رامي نادر', sex: 'F', age: 20, disability: false }];
  db.sessions = [
    { id: 's1', projectId: 'p1', activityId: 'a1', centerId: 'c1', date: '2026-01-05', educator: 'م1', mode: 'roll', attendance: ['b1', 'b2', 'b3'] },
    { id: 's2', projectId: 'p1', activityId: 'a1', centerId: 'c1', date: '2026-02-10', educator: 'م1', mode: 'roll', attendance: ['b1', 'b2'] },
    { id: 's3', projectId: 'p1', activityId: 'a1', centerId: 'c2', date: '2026-04-20', educator: 'م2', mode: 'roll', attendance: ['b1'], units: 2 },
    { id: 's4', projectId: 'p1', activityId: 'a2', centerId: 'c1', date: '2026-01-15', educator: 'م1', mode: 'roll', attendance: ['b4', 'b5'] },
    { id: 's5', projectId: 'p1', activityId: 'a2', centerId: 'c1', date: '2026-02-15', educator: 'م1', mode: 'counts', counts: { M: 1, F: 3, MWD: 0, FWD: 1 }, bandCounts: { M: [0, 0, 0, 0, 1, 0, 0], F: [0, 0, 0, 0, 1, 2, 0], MWD: [0, 0, 0, 0, 0, 0, 0], FWD: [0, 0, 0, 0, 0, 1, 0] } },
    { id: 's6', projectId: 'p1', activityId: 'a2', centerId: 'c1', date: '2026-03-15', educator: 'م1', mode: 'counts', counts: { M: 2, F: 2, MWD: 0, FWD: 0 } }];
  return db;
}

let seed = 42; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
export function big() {
  const db = tiny(); const p = db.projects[0];
  db.beneficiaries = []; db.sessions = [];
  for (let i = 0; i < 150; i++) {
    const kid = i < 110; db.beneficiaries.push({ id: 'B' + i, name: `اسم ${i} أب جد عائلة${i}`, sex: rnd() < 0.5 ? 'M' : 'F', age: kid ? 4 + Math.floor(rnd() * 12) : 19 + Math.floor(rnd() * 25), disability: rnd() < 0.08, disabilityType: 'حركية', phone: '0599' + String(100000 + i) });
  }
  const kids = db.beneficiaries.slice(0, 110), adults = db.beneficiaries.slice(110);
  for (let i = 0; i < 160; i++) {
    const kid = rnd() < 0.7, pool = kid ? kids : adults, a = kid ? 'a1' : 'a2';
    const day = 1 + Math.floor(rnd() * 27), mon = 1 + Math.floor(rnd() * 12);
    const att = pool.filter(() => rnd() < 0.2).map((b) => b.id);
    const date = `2026-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (rnd() < 0.8 && att.length) db.sessions.push({ id: 'S' + i, projectId: 'p1', activityId: a, centerId: rnd() < 0.5 ? 'c1' : 'c2', date, educator: 'م' + (i % 4), mode: 'roll', attendance: att, units: rnd() < 0.1 ? 2 : 1 });
    else db.sessions.push({ id: 'S' + i, projectId: 'p1', activityId: a, centerId: 'c1', date, educator: 'م1', mode: 'counts', counts: { M: 3, F: 4, MWD: 1, FWD: 0 } });
  }
  return db;
}
