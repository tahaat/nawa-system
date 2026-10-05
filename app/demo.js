import { uid } from '../core/model.js';
// مشروع تجريبي لتجربة النظام (بيانات وهمية بالكامل)
export function demo(db) {
  const c1 = { id: uid('c'), name: 'مكتبة الخضر' }, c2 = { id: uid('c'), name: 'حدائق نوى' }, c3 = { id: uid('c'), name: 'مركز الزيتونة' };
  db.centers.push(c1, c2, c3);
  const iv = ['child', 'child', 'parent', 'localEducator'].map((g, i) => ({ id: uid('i'), result: ['R1', 'R1', 'R3', 'R2'][i], name: ['تدخلات المكتبة', 'تدخلات المدارس', 'أنشطة الأهالي', 'تدريب المنشطين المحليين'][i], group: g }));
  const A = (name, i, type, g, ageMin, ageMax, planned) => ({ id: uid('a'), name, type, interventionId: iv[i].id, group: g, ageMin, ageMax, plannedSessions: planned });
  const acts = [A('قراءة وحكايات', 0, 'Library', 'child', 4, 12, 24), A('دعم الرياضيات', 1, 'Schools', 'child', 7, 15, 30), A('الرعاية الذاتية', 2, 'Parents', 'parent', 19, 60, 12), A('تدريب المنشطين', 3, 'Training', 'localEducator', 19, 45, 6)];
  const p = { id: uid('p'), name: 'مشروع تجريبي', donor: 'ممول تجريبي', start: '2026-01-01', end: '2026-12-31', directRule: { mode: 'once' }, interventions: iv, activities: acts,
    outputIndicators: [{ id: uid('o'), output: 'output 1', name: 'عدد الأطفال المستفيدين من التدخلات', activityIds: [acts[0].id, acts[1].id], measure: 'unique' }, { id: uid('o'), output: 'output 2', name: 'عدد مشاركات الأهالي', activityIds: [acts[2].id], measure: 'sessions-attendance' }] };
  db.projects.push(p);
  const names = ['أحمد', 'سلمى', 'يوسف', 'منى', 'ليلى', 'عمر', 'هدى', 'خالد', 'رنا', 'محمد', 'آية', 'سامي']; let n = 0;
  for (let i = 0; i < 24; i++) db.beneficiaries.push({ id: uid('b'), name: `${names[i % 12]} ${names[(i * 5 + 3) % 12]} ${names[(i * 7 + 1) % 12]} عائلة${i}`, sex: i % 2 ? 'F' : 'M', age: i < 18 ? 7 + (i % 6) : 25 + i, disability: i % 11 === 0, disabilityType: i % 11 === 0 ? 'حركية' : '', phone: '059' + (9000000 + i * 137) });
  const kids = db.beneficiaries.slice(0, 18), adults = db.beneficiaries.slice(18);
  for (let m = 0; m < 6; m++) for (const [a, pool] of [[acts[0], kids], [acts[1], kids], [acts[2], adults]]) for (let k = 0; k < 2; k++) db.sessions.push({ id: uid('s'), projectId: p.id, activityId: a.id, centerId: [c1, c2, c3][(m + k) % 3].id, date: `2026-0${m + 1}-${String(3 + k * 10 + m).padStart(2, '0')}`, educator: ['ريم', 'سامر'][k], mode: 'roll', attendance: pool.filter((_, j) => (j + m + k) % 2 === 0).map((b) => b.id) });
  return p;
}
