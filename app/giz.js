// مشروع «Voices of Survival» (GIZ 2026–2027): بنية الإطار المنطقي كما وردت في ملف Final Logical Framework،
// مع بيانات تجريبية مولّدة (أسماء وأرقام وهمية بذرة ثابتة) لتجربة نماذج الكشوفات والإنجاز التشغيلي. كل شيء موسوم demo ويُحذف دفعة واحدة.
import { newDb } from '../core/model.js';
import { TEMPLATES, SCALES } from '../core/forms.js';
import { newSheet, commitSheet } from '../core/sheets.js';

let seed = 77; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)], ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const M1 = ['محمد', 'أحمد', 'يوسف', 'عمر', 'خالد', 'سامي', 'رامي', 'إبراهيم', 'مصطفى', 'عدي'], F1 = ['سلمى', 'ليلى', 'منى', 'هدى', 'رنا', 'آية', 'جنى', 'لين', 'ريم', 'دانا'], FAM = ['أبو عودة', 'عطية', 'صرصور', 'النجار', 'حمدان', 'الأسطل', 'شعت', 'البطش', 'الغول', 'سالم'];
const MARK = (o) => ({ ...o, demo: true });

export const GIZ_ID = 'p_giz';
export function giz() {
  const db = newDb();
  db.centers = [{ id: 'c_main', name: 'المبنى الرئيسي' }, { id: 'c_khadr', name: 'مكتبة الخضر' }, { id: 'c_zay', name: 'مركز الزيتونة' }, { id: 'c_gar', name: 'حدائق نوى' }];
  const iv = [{ id: 'i1', result: 'R1', name: 'الدعم النفسي-الاجتماعي (أطفال 4-15)', group: 'child' }, { id: 'i2', result: 'R1', name: 'التعليم (أطفال 4-15)', group: 'child' },
    { id: 'i3', result: 'R2', name: 'دعم الأهالي', group: 'parent' }, { id: 'i4', result: 'R3', name: 'توثيق التراث الشفوي (المُحاوَرون)', group: 'community' }];
  const A = (id, name, type, i, g, a0, a1, pl, ops = false) => ({ id, name, type, interventionId: i, group: g, ageMin: a0, ageMax: a1, plannedSessions: pl, ...(ops ? { ops: true, planMonths: [0, 8] } : { planMonths: [0, 8] }) });
  const acts = [
    A('a_story', 'Daily healing storytelling sessions', 'Psychosocial', 'i1', 'child', 4, 15, 170), A('a_arts', 'Daily healing arts sessions', 'Psychosocial', 'i1', 'child', 4, 15, 170),
    A('a_move', 'Daily healing physical movement', 'Psychosocial', 'i1', 'child', 4, 15, 170), A('a_edu', 'Daily education sessions', 'Educational', 'i2', 'child', 4, 15, 170), A('a_open', 'Recreational open days', 'Recreational', 'i1', 'child', 4, 15, 9),
    A('a_ppss', 'Monthly psychosocial support sessions for parents', 'Psychosocial', 'i3', 'parent', 19, 90, 9), A('a_prec', 'Group recreational activities for parents', 'Recreational', 'i3', 'parent', 19, 90, 4),
    A('a_oral', 'Collect oral history from community elders and history bearers', 'Cultural', 'i4', 'community', 40, 100, 60),
    A('a_audit', 'Conduct an external financial audit', 'Operational', 'i4', 'community', null, null, 1, true), A('a_maint', 'Repair and maintain NAWA buildings (civil + electrical engineers, elevator maintenance)', 'Operational', 'i4', 'community', null, null, 6, true),
    A('a_proc', 'Procure tools and supplies', 'Operational', 'i4', 'community', null, null, 6, true), A('a_host', "Provide children's hospitality during activity days", 'Operational', 'i4', 'community', null, null, 9, true),
    A('a_arch', "Archive NAWA's financial and administrative documents on NAWA's automated systems", 'Operational', 'i4', 'community', null, null, 9, true), A('a_photo', 'Provide photography services for documenting NAWA centres activities', 'Operational', 'i4', 'community', null, null, 9, true),
    A('a_trans', 'Cover transportation costs for the team', 'Operational', 'i4', 'community', null, null, 9, true), A('a_solar', 'Solar System Procurement (no installation)', 'Operational', 'i4', 'community', null, null, 1, true)];
  const T = (M, F, CWD_M, CWD_F) => ({ M, F, CWD_M, CWD_F });
  const risks = ['Security', 'Restricted Access & Movement', 'Psychological Impact on Staff & Beneficiaries', 'Economic Hardship & Resource Scarcity', 'Infrastructure & Power Collapse', 'Community Trauma & Displacement'];
  const goal = 'The contribution to building the capacity of children and families in Deir Al-Balah for psychological and social resilience and recovery, and the preservation of their cultural identity, in the face of ongoing destruction and conflict in Gaza.';
  const p = {
    id: GIZ_ID, name: 'Voices of Survival: Empowering Gaza’s Children Through Learning and Healing', donor: 'GIZ', start: '2026-07-01', end: '2027-03-31', directRule: { mode: 'once' },
    interventions: iv, activities: acts,
    outputIndicators: [
      { id: 'o11', output: 'output 1', name: '# of PSS and educational sessions conducted', activityIds: ['a_story', 'a_arts', 'a_move', 'a_edu', 'a_open'], measure: 'sessions-held', target: { M: 689 } },
      { id: 'o12', output: 'output 1', name: '# of children who participated in psychosocial support sessions', activityIds: ['a_story', 'a_arts', 'a_move', 'a_open'], measure: 'unique', target: T(285, 285, 15, 15) },
      { id: 'o21', output: 'output 2', name: '# of PSS sessions held for parents', activityIds: ['a_ppss', 'a_prec'], measure: 'sessions-held', target: { M: 13 } },
      { id: 'o22', output: 'output 2', name: '# of parents (200) participating in the support sessions', activityIds: ['a_ppss', 'a_prec'], measure: 'unique', target: T(20, 170, 4, 6) },
      { id: 'o31', output: 'output 3', name: '# of people interviewed', activityIds: ['a_oral'], measure: 'sessions-attendance', target: { M: 30, F: 30 } },
      { id: 'o41', output: 'output 3', name: '# of financial audit reports completed', activityIds: ['a_audit'], measure: 'count', target: { M: 1 } },
      { id: 'o42', output: 'output 3', name: '# of NAWA’s buildings receiving infrastructure and operational readiness support', activityIds: ['a_maint'], measure: 'count', target: { M: 4 } },
      { id: 'o43', output: 'output 3', name: '# of operational support mechanisms provided to sustain project implementation and service delivery', activityIds: ['a_proc', 'a_host', 'a_arch', 'a_photo', 'a_trans', 'a_solar'], measure: 'count', target: { M: 6 } }],
    outcomeIndicators: [
      { id: 'oc1', name: '(%) of children who reported improvement in their well-being', row: 7, formId: 'child_wellbeing', kind: 'improvement', minGain: 3, target: T(70, 70, 60, 60) },
      { id: 'oc2', name: '(%) of children who show improvement in educational skill', row: 8, formId: 'child_learning', kind: 'improvement', minGain: 3, target: T(70, 70, 60, 60) },
      { id: 'oc3', name: "(%) of parents who report increased knowledge and skills in supporting their children's psychosocial well-being", row: 9, formId: 'parent_practices', kind: 'improvement', minGain: 3, target: T(60, 60, 50, 50) }],
    directTarget: T(305, 455, 19, 21),
    impact: { text: goal, indicator: '' },
    info: { title: 'Voices of Survival: Empowering Gaza’s Children Through Learning and Healing', objective: goal, summary: '600 children (4-15) in healing and education sessions, 200 parents in support sessions, oral-history documentation, and organizational sustainability support — 1 Jul 2026 to 31 Mar 2027.',
      directPlanned: 800, sectors: ['Educational', 'Psychosocial Support (Mental Health)', 'Cultural'], partners: ['NGO'], targetGroups: ['Children- School age', 'children pre school', 'Parents'], geo: 'Deir Al Balah', amend: false },
    logframe: {
      3: { text: goal, risk: risks.join('\n') },
      5: { text: 'Specific Objective (1): Enhance the psychosocial well-being and educational outcomes of 600 children aged 4-15 years in Deir Al-Balah.', ind: '(%) of children who reported improvement in their well-being.\n(%) of children who show improvement in educational skill.', src: 'Wellbeing assessment tool (baseline/endline).\nDiagnostic educational tests (baseline/endline).\nFocus Group Discussion (FGD) report.' },
      7: { text: 'Output (1.1): PSS and Education Programme Conducted.', ind: '(#) of PSS and educational sessions conducted.\n(#) of children who participated in psychosocial support sessions', src: 'Attendance records. Session reports. Photos. PTT. BTT' },
      8: { text: '1. Implement daily healing storytelling sessions.' }, 9: { text: '2. Implement daily healing arts sessions.' }, 10: { text: '3. Implement daily healing physical movement.' }, 11: { text: '4. Implement daily education sessions.' }, 12: { text: '5. Implement recreational open days.' },
      18: { text: 'Specific Objective (2): Strengthen the capacity of 200 parents to support traumatised children.', ind: "(%) of parents who report increased knowledge and skills in supporting their children's psychosocial well-being.", src: '(baseline/endline) tool; Focus Group Discussion (FGD) reports' },
      20: { text: 'Output (2.1): Parental Support Enhanced.', ind: '(#) of PSS sessions held for parents.\n(#) of parents (200) participating in the support sessions.', src: 'Attendance records. Session reports. Photos. PTT. BTT' },
      22: { text: 'Activities (2.1.1): 1. Conduct monthly psychosocial support sessions for parents. 2. Conduct group recreational activities for parents.' },
      23: { text: "Specific Objective (3): Preserve and document Deir Al-Balah's cultural heritage to safeguard its identity.", ind: '(#) of oral histories and stories collected and documented.', src: 'A digital archive (audio recordings, written transcripts). Final documentation report.' },
      27: { text: 'Output (3.1): Heritage Documentation Completed.', ind: '(#) of people interviewed.', src: 'Interview records; heritage documentation records; photos.' },
      29: { text: 'Activity (3.1.1): Collect oral history (narratives and stories) from community elders and history bearers.' },
      33: { text: 'Specific Objective (4): Strengthen NAWA’s organizational sustainability and operational resilience to ensure accountable, efficient, and continuous service delivery. Output (4.1): Organisational Capacity Strengthened.', ind: '(#) of financial audit reports completed.\n(#) of NAWA’s buildings receiving infrastructure and operational readiness support.\n(#) of operational support mechanisms provided to sustain project implementation and service delivery.', src: 'External financial audit report; maintenance and engineering reports; procurement and handover records; transportation records; photography/documentation records; children’s hospitality records.' },
      35: { text: acts.filter((a) => a.ops).map((a, i) => `4.1.${i + 1} ${a.name}`).join('\n') } },
    assumptions: risks.map((r) => ({ text: r, mitigation: '', fulfilled: '', strategy: '' })), learning: [], profile: {}, meal: {} };
  db.projects = [p];
  // ---- بيانات تجريبية ----
  const mk = (n, sexP, a0, a1, dis = 0.06) => Array.from({ length: n }, () => { const sex = rnd() < sexP ? 'F' : 'M', d = rnd() < dis; const b = { id: `b${db.beneficiaries.length + 1}`, name: `${sex === 'M' ? pick(M1) : pick(F1)} ${pick(M1)} ${pick(M1)} ${pick(FAM)}`, sex, age: ri(a0, a1), disability: d, disabilityType: d ? pick(['حركية', 'سمعية', 'ذهنية']) : '', phone: '059' + ri(1000000, 9999999), center: 'c_main' }; db.beneficiaries.push(b); return b; });
  const k46 = mk(10, 0.5, 4, 6), k712 = mk(22, 0.55, 7, 12), k1315 = mk(8, 0.55, 13, 15), par = mk(12, 0.85, 26, 48, 0.03), eld = mk(6, 0.5, 55, 80, 0);
  const sh = (kind, act, ctr, meta, lists, meetings) => { const s = newSheet(kind, GIZ_ID, ctr); s.activityId = act; s.meta = { mode: 'inperson', ...meta }; Object.assign(s, lists); if (meetings) s.meetings = meetings; s.demo = true; commitSheet(db, s); return s; };
  const meet = (dates, ids, drop = 0) => dates.map((d, i) => ({ n: i + 1, date: d, present: ids.filter((_, j) => !((j + i) % 7 === 0 && drop)) }));
  const id = (a) => a.map((x) => x.id);
  sh('course', 'a_story', 'c_main', { title: 'قصص الشفاء — المجموعة أ', type: 'دعم نفسي واجتماعي', facilitator: 'سناء الأسطل', start: '2026-07-12', end: '2026-08-09', hours: 7.5, meetings: 5, from: '09:00', to: '10:30', venue: 'القاعة 1', mandatoryPct: 75, groups: ['c712'] }, { roster: id(k712.slice(0, 12)) }, meet(['2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02', '2026-08-09'], id(k712.slice(0, 12)), 1));
  sh('course', 'a_arts', 'c_khadr', { title: 'فنون الشفاء — الصغار', type: 'فنية', facilitator: 'منى أبو شمالة', start: '2026-07-14', end: '2026-08-04', hours: 4, meetings: 4, from: '10:00', to: '11:00', venue: 'قاعة الفنون', mandatoryPct: 75, groups: ['c46'] }, { roster: id(k46.slice(0, 8)) }, meet(['2026-07-14', '2026-07-21', '2026-07-28', '2026-08-04'], id(k46.slice(0, 8)), 1));
  sh('course', 'a_edu', 'c_zay', { title: 'تعلّم القراءة والحساب', type: 'تعليمية', facilitator: 'رهف الحاج', start: '2026-08-02', end: '2026-08-23', hours: 8, meetings: 4, from: '09:00', to: '11:00', venue: 'الصف 2', mandatoryPct: 80, groups: ['c712', 'y1315'] }, { roster: id([...k712.slice(12, 20), ...k1315.slice(0, 4)]) }, meet(['2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23'], id([...k712.slice(12, 20), ...k1315.slice(0, 4)]), 1));
  sh('course', 'a_move', 'c_gar', { title: 'حركة الشفاء', type: 'رياضية/حركية', facilitator: 'عدي الغول', start: '2026-08-30', end: '2026-09-13', hours: 4.5, meetings: 3, from: '16:00', to: '17:30', venue: 'الساحة الخارجية', mandatoryPct: 70, groups: ['c712', 'y1315'] }, { roster: id([...k712.slice(0, 6), ...k1315.slice(4, 8)]) }, meet(['2026-08-30', '2026-09-06', '2026-09-13'], id([...k712.slice(0, 6), ...k1315.slice(4, 8)]), 1));
  sh('openday', 'a_open', 'c_main', { activities: ['رسم حر', 'حكاية جماعية', 'ألعاب حركية'], facilitators: ['سناء الأسطل', 'منى أبو شمالة'], type: 'يوم ترفيهي', date: '2026-08-20', from: '10:00', to: '13:00', venue: 'الباحة', groups: ['c46', 'c712', 'y1315'] }, { roster: id([...k46.slice(0, 5), ...k712.slice(0, 8), ...k1315.slice(0, 3)]) });
  sh('parents', 'a_ppss', 'c_main', { title: 'كيف أدعم طفلي بعد الصدمة', type: 'دعم نفسي واجتماعي', facilitator: 'د. ريم الأسطل', start: '2026-08-05', end: '2026-09-02', meetings: 3, from: '11:00', to: '12:30', venue: 'قاعة الأهالي', groups: ['parents'] }, { roster: id(par.slice(0, 9)) }, meet(['2026-08-05', '2026-08-19', '2026-09-02'], id(par.slice(0, 9)), 1));
  sh('joint', 'a_prec', 'c_main', { title: 'أمسية حكاية مشتركة', type: 'ترفيهي', facilitator: 'سناء الأسطل', date: '2026-09-10', from: '16:00', to: '17:30', venue: 'القاعة 1', groups: ['c712', 'parents'] }, { roster: id(k712.slice(0, 6)), rosterP: id(par.slice(0, 5)) });
  sh('visit', 'a_open', 'c_khadr', { activities: ['جولة في المكتبة', 'حكاية'], facilitators: ['منى أبو شمالة'], date: '2026-09-15', from: '10:00', to: '11:30', type: 'زيارة مدرسية', venue: 'قاعة المطالعة', body: 'مدرسة الأمل الأساسية', contact: 'أ. محمود النجار', contactPhone: '0599123456', groups: ['c712'] }, { guests: Array.from({ length: 10 }, () => ({ name: `${pick(M1)} ${pick(M1)} ${pick(M1)} ${pick(FAM)}`, sex: rnd() < 0.5 ? 'F' : 'M', age: ri(7, 12), disability: false, dtype: '' })) });
  eld.slice(0, 3).forEach((e, i) => sh('interview', 'a_oral', 'c_gar', { title: `رواية من ذاكرة المكان ${i + 1}`, type: 'رواية شفوية', facilitator: 'باحث ميداني', date: `2026-09-${String(6 + i * 3).padStart(2, '0')}`, from: '10:00', to: '11:00', place: 'منزل الراوي', consent: 'موافقة كاملة (تسجيل ونشر)', recordRef: `AR-${100 + i}`, groups: ['elders'] }, { guests: [{ name: `${e.name}`, sex: e.sex, age: e.age, disability: false, dtype: '' }] }));
  const op = (act, date, qty, ref, ctr = null) => db.ops.push(MARK({ id: `op${db.ops.length + 1}`, projectId: GIZ_ID, activityId: act, centerId: ctr, date, qty, ref }));
  op('a_audit', '2026-09-20', 1, 'تقرير التدقيق الخارجي — المرحلة الأولى'); op('a_maint', '2026-08-10', 1, 'محضر معاينة هندسية 12', 'c_main'); op('a_maint', '2026-08-25', 1, 'محضر تسليم صيانة المصعد', 'c_khadr');
  op('a_proc', '2026-07-30', 1, 'فاتورة شراء 114'); op('a_host', '2026-08-20', 1, 'كشف ضيافة اليوم المفتوح'); op('a_arch', '2026-09-01', 1, 'سجل أرشفة 2026-08'); op('a_photo', '2026-08-20', 1, 'ملف تصوير اليوم المفتوح'); op('a_trans', '2026-09-05', 1, 'كشف مواصلات أغسطس');
  // استبيانات قبلي/بعدي
  const rows = [['child_wellbeing', [...k712.slice(0, 12), ...k46.slice(0, 4)]], ['child_learning', k712.slice(12, 20)], ['parent_practices', par.slice(0, 9)]];
  for (const [fid, grp] of rows) { const tpl = TEMPLATES.find((t) => t.id === fid), mx = tpl.items.length * SCALES[tpl.scale].length;
    grp.forEach((b) => { const base = Math.round(mx * (0.4 + rnd() * 0.3)), gain = Math.round(mx * (rnd() * 0.25 - 0.02));
      for (const [round, date, sc] of [['baseline', '2026-07-08', base], ['endline', '2026-09-25', Math.min(mx, base + gain)]]) db.surveyResponses.push(MARK({ id: `r_${fid}_${b.id}_${round}`, uuid: `giz-${fid}-${b.id}-${round}`, formId: fid, projectId: GIZ_ID, bnfId: b.id, round, date, score: sc, max: mx, answers: { center: 'c_main' } })); }); }
  for (const k of ['projects', 'centers', 'beneficiaries']) db[k].forEach((r) => { r.demo = true; });
  return db;
}

// كشوف تجريبية إضافية بأسماء وهمية لأنواع الكشوف التي ينقصها المثال (تربويون، نشاط، رحلة) — تُضاف عند الطلب دون المساس ببقية البيانات
export function gizExtras(db) {
  let sd = 4242; const r = () => ((sd = (sd * 1664525 + 1013904223) % 4294967296) / 4294967296), pk = (a) => a[Math.floor(r() * a.length)], rin = (a, b) => a + Math.floor(r() * (b - a + 1));
  const have = new Set(db.sheets.map((s) => s.id)); let added = 0;
  const FN = ['ريم', 'هبة', 'دعاء', 'إسراء', 'نور', 'آلاء', 'سجى', 'ميس'], MN = ['أسامة', 'بلال', 'ثائر', 'جمال', 'حاتم', 'زياد', 'ماجد', 'نبيل'], P = ['الشوا', 'أبو سيدو', 'العطار', 'البردويل', 'الحلو', 'قنن', 'مقداد', 'الدباغ'];
  if (!db.beneficiaries.some((b) => b.id === 'bx_e1')) for (let i = 1; i <= 14; i++) { const sex = i % 4 === 0 ? 'M' : 'F', d = i === 5; db.beneficiaries.push({ id: 'bx_e' + i, name: `${sex === 'F' ? pk(FN) : pk(MN)} ${pk(MN)} ${pk(MN)} ${pk(P)}`, sex, age: rin(24, 52), disability: d, disabilityType: d ? 'حركية' : '', phone: '059' + rin(1000000, 9999999), center: 'c_main', demo: true }); }
  const edu = db.beneficiaries.filter((b) => b.id.startsWith('bx_e')).map((b) => b.id), kids = db.beneficiaries.filter((b) => b.demo && b.age >= 7 && b.age <= 15 && !b.id.startsWith('bx_')).map((b) => b.id);
  const mk = (id, kind, act, meta, lists, meetings) => { if (have.has(id)) return; const s = newSheet(kind, GIZ_ID, 'c_main'); s.id = id; s.activityId = act; s.meta = { mode: 'inperson', ...meta }; Object.assign(s, lists); if (meetings) s.meetings = meetings; s.demo = true; commitSheet(db, s); added++; };
  const meet = (dates, ids) => dates.map((d, i) => ({ n: i + 1, date: d, present: ids.filter((_, j) => (j + i) % 6 !== 0) }));
  mk('sx_edu', 'edu', 'a_edu', { title: 'أساليب الدعم النفسي الاجتماعي في الصف', type: 'ورشة عمل', facilitator: 'د. ريم الأسطل', start: '2026-09-01', end: '2026-09-15', hours: 12, meetings: 4, from: '09:00', to: '12:00', venue: 'القاعة 2', mandatoryPct: 75, groups: ['edN', 'edS'] }, { roster: edu }, meet(['2026-09-01', '2026-09-08', '2026-09-10', '2026-09-15'], edu));
  mk('sx_act', 'activity', 'a_arts', { title: 'ورشة رسم الذاكرة', type: 'فني', facilitator: 'منى أبو شمالة', date: '2026-09-18', from: '10:00', to: '12:00', venue: 'قاعة الفنون', booklet: 'مطوية «ألواني»', groups: ['c712', 'y1315'] }, { roster: kids.slice(0, 32) });
  mk('sx_trip', 'trip', 'a_open', { type: 'رحلة ثقافية إلى متحف القرارة', date: '2026-09-25', facilitator: 'عدي الغول', from: '08:00', to: '14:00', place: 'متحف القرارة', booklet: 'دليل الرحلة', groups: ['c712', 'y1315'] }, { roster: kids.slice(10, 28) });
  return added;
}
