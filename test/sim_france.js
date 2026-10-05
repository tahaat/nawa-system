// محاكاة مشروع حقيقي الشكل: مبنية على بنية STT 2026 (مشروع FRANCE) — المراكز والأنشطة والفئات ومتوسطات الحضور من الملف،
// أما الأسماء والأرقام الفردية فمولّدة عشوائيًا (بذرة ثابتة) ولا تحوي بيانات حقيقية.
import { newDb } from '../core/model.js';
let seed = 2026; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)], ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const poisson = (m) => Math.max(1, Math.round(m + (rnd() + rnd() + rnd() - 1.5) * Math.sqrt(m) * 1.4));
const F1 = ['محمد', 'أحمد', 'يوسف', 'عمر', 'خالد', 'سامي', 'رامي', 'إبراهيم', 'مصطفى', 'عدي'], F2 = ['سلمى', 'ليلى', 'منى', 'هدى', 'رنا', 'آية', 'جنى', 'لين', 'ريم', 'دانا'],
  FAM = ['أبو عودة', 'عطية', 'صرصور', 'النجار', 'حمدان', 'الأسطل', 'شعت', 'البطش', 'الغول', 'سالم'];
export function france() {
  const db = newDb();
  const C = { hub: { id: 'c_hub', name: 'NAWA HUB' }, kg: { id: 'c_kg', name: 'Al Hekayat KG' } }; db.centers = [C.hub, C.kg];
  const iv = [{ id: 'i1', result: 'R1', name: 'تعليم الأطفال 7-12', group: 'child' }, { id: 'i2', result: 'R1', name: 'تعليم الأطفال دون السادسة', group: 'child' },
    { id: 'i3', result: 'R2', name: 'الدعم النفسي-الاجتماعي', group: 'child' }, { id: 'i4', result: 'R2', name: 'أنشطة ثقافية للفتيان', group: 'youth' }, { id: 'i5', result: 'R3', name: 'جلسات توعية الأهالي', group: 'parent' }];
  const A = (id, name, type, i, g, a0, a1, pl) => ({ id, name, type, interventionId: i, group: g, ageMin: a0, ageMax: a1, plannedSessions: pl });
  const acts = [A('a_ar7', 'Arabic Education sessions (7-12)', 'Educational', 'i1', 'child', 7, 12, 160), A('a_ma7', 'Math Education sessions (7-12)', 'Educational', 'i1', 'child', 7, 12, 160),
    A('a_ar4', 'Arabic Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 90), A('a_ma4', 'Math Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 70), A('a_en4', 'English Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 40),
    A('a_ha', 'Healing arts', 'Psychosocial', 'i3', 'child', 4, 12, 90), A('a_hs', 'Healing Storytelling', 'Psychosocial', 'i3', 'child', 4, 12, 90), A('a_hp', 'Healing Physical Movements', 'Psychosocial', 'i3', 'child', 4, 12, 40),
    A('a_dr', 'Drama Workshop', 'Cultural', 'i4', 'youth', 13, 15, 30), A('a_ca', 'Arabic Calligraphy', 'Cultural', 'i4', 'youth', 13, 15, 10), A('a_aw', 'Awareness sessions', 'Educational', 'i5', 'parent', 19, 60, 16)];
  db.projects = [{ id: 'p_fr', name: "FRANCE: A Response to Gaza's Trauma and Education Needs", donor: 'CITIES-UNIES FRANCE', start: '2026-01-01', end: '2026-12-31', directRule: { mode: 'threshold', minSessions: 8, minPct: 0 },
    interventions: iv, activities: acts,
    outputIndicators: [
      { id: 'o1', output: 'output 1', name: 'أطفال 7-12 في الجلسات التعليمية', activityIds: ['a_ar7', 'a_ma7'], measure: 'unique' },
      { id: 'o2', output: 'output 1', name: 'أطفال دون السادسة في الجلسات التعليمية', activityIds: ['a_ar4', 'a_ma4', 'a_en4'], measure: 'unique' },
      { id: 'o3', output: 'output 2', name: 'أطفال في أنشطة الدعم النفسي', activityIds: ['a_ha', 'a_hs', 'a_hp'], measure: 'unique' },
      { id: 'o4', output: 'output 2', name: 'فتيان في الأنشطة الثقافية', activityIds: ['a_dr', 'a_ca'], measure: 'unique' },
      { id: 'o5', output: 'output 3', name: 'حضور الأهالي لجلسات التوعية', activityIds: ['a_aw'], measure: 'sessions-attendance' }],
    outcomeIndicators: [] }];
  const mk = (n, g, a0, a1, fSh) => { for (let i = 0; i < n; i++) { const sex = rnd() < fSh ? 'F' : 'M', dis = rnd() < 0.06;
    db.beneficiaries.push({ id: `b${db.beneficiaries.length + 1}`, name: `${sex === 'M' ? pick(F1) : pick(F2)} ${pick(F1)} ${pick(F1)} ${pick(FAM)}`, sex, age: ri(a0, a1), disability: dis, ...(dis ? { disabilityType: pick(['حركية', 'سمعية', 'ذهنية']) } : {}), phone: '059' + ri(1e6, 9e6), status: pick(['نازح', 'مقيم']), center: 'c_hub' }); } };
  mk(70, 'c7', 7, 12, 0.64); mk(14, 'c4', 4, 6, 0.5); mk(26, 'y', 13, 15, 0.8); mk(32, 'p', 24, 48, 1);
  const B = db.beneficiaries, kids7 = B.filter((b) => b.age >= 7 && b.age <= 12), kids4 = B.filter((b) => b.age <= 6), youth = B.filter((b) => b.age >= 13 && b.age <= 15), par = B.filter((b) => b.age >= 19);
  // [مركز، نشاط، عدد الجلسات الحقيقي في STT، متوسط الحضور، وضع الإدخال، مجموعة الأسماء]
  const plan = [[C.hub, 'a_ar7', 120, 10.3, 'roll', kids7], [C.hub, 'a_ma7', 120, 11.1, 'roll', kids7], [C.hub, 'a_ha', 45, 9.4, 'roll', kids7], [C.hub, 'a_hs', 45, 12.4, 'roll', kids7], [C.hub, 'a_hp', 15, 11.3, 'roll', kids7],
    [C.hub, 'a_dr', 22, 14, 'roll', youth], [C.hub, 'a_ca', 8, 14.1, 'roll', youth], [C.hub, 'a_aw', 14, 10.8, 'roll', par], [C.hub, 'a_ha', 10, 8.5, 'roll', kids4], [C.hub, 'a_ma4', 4, 6, 'roll', kids4],
    [C.kg, 'a_ar4', 84, 21, 'counts'], [C.kg, 'a_ma4', 70, 21, 'counts'], [C.kg, 'a_en4', 40, 21, 'counts'], [C.kg, 'a_ha', 20, 21, 'counts'], [C.kg, 'a_hs', 20, 20.6, 'counts'], [C.kg, 'a_hp', 12, 21, 'counts']];
  const educ = ['ألماظة العطار', 'منى أبو شمالة', 'رهف الحاج', 'سناء الأسطل'];
  const days = []; for (let m = 0; m < 6; m++) for (let d = 1; d <= 28; d++) { const wd = new Date(Date.UTC(2026, m, d)).getUTCDay(); if (wd !== 5 && wd !== 6) days.push(`2026-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`); }
  let n = 0;
  for (const [c, a, cnt, avg, mode, pool] of plan) for (let i = 0; i < cnt; i++) {
    const s = { id: `s${++n}`, projectId: 'p_fr', activityId: a, centerId: c.id, date: pick(days), educator: pick(educ), mode };
    if (mode === 'roll') { const k = Math.min(pool.length, poisson(avg)); s.attendance = [...pool].sort(() => rnd() - 0.5).slice(0, k).map((b) => b.id); }
    else { const t = poisson(avg), dM = Math.round(t * 0.6), wd = rnd() < 0.12 ? 1 : 0; s.counts = { M: dM - (wd ? 1 : 0), F: t - dM, MWD: wd, FWD: 0 }; }
    db.sessions.push(s);
  }
  return db;
}
