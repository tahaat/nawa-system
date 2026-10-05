// محاكاة مشروع حقيقي الشكل: مبنية على بنية STT 2026 (مشروع FRANCE) — المراكز والأنشطة والفئات ومتوسطات الحضور من الملف،
// أما الأسماء والأرقام الفردية فمولّدة عشوائيًا (بذرة ثابتة) ولا تحوي بيانات حقيقية.
import { newDb } from '../core/model.js';
import { TEMPLATES } from '../core/forms.js';
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
  const A = (id, name, type, i, g, a0, a1, pl) => ({ id, name, type, interventionId: i, group: g, ageMin: a0, ageMax: a1, plannedSessions: Math.round(pl * 1.5) });
  const acts = [A('a_ar7', 'Arabic Education sessions (7-12)', 'Educational', 'i1', 'child', 7, 12, 160), A('a_ma7', 'Math Education sessions (7-12)', 'Educational', 'i1', 'child', 7, 12, 160),
    A('a_ar4', 'Arabic Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 90), A('a_ma4', 'Math Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 70), A('a_en4', 'English Education sessions (4-6)', 'Educational', 'i2', 'child', 4, 6, 40),
    A('a_ha', 'Healing arts', 'Psychosocial', 'i3', 'child', 4, 12, 90), A('a_hs', 'Healing Storytelling', 'Psychosocial', 'i3', 'child', 4, 12, 90), A('a_hp', 'Healing Physical Movements', 'Psychosocial', 'i3', 'child', 4, 12, 40),
    A('a_dr', 'Drama Workshop', 'Cultural', 'i4', 'youth', 13, 15, 30), A('a_ca', 'Arabic Calligraphy', 'Cultural', 'i4', 'youth', 13, 15, 10), A('a_aw', 'Awareness sessions', 'Educational', 'i5', 'parent', 19, 60, 16)];
  db.projects = [{ id: 'p_fr', name: "FRANCE: A Response to Gaza's Trauma and Education Needs", donor: 'CITIES-UNIES FRANCE', start: '2026-01-01', end: '2026-12-31', directRule: { mode: 'threshold', minSessions: 8, minPct: 0 },
    interventions: iv, activities: acts,
    outputIndicators: [
      { id: 'o1', output: 'output 1', name: 'أطفال 7-12 في الجلسات التعليمية', activityIds: ['a_ar7', 'a_ma7'], measure: 'unique', target: { M: 60, F: 100, CWD_M: 5, CWD_F: 5 }, baseline: { M: 0, F: 0, CWD_M: 0, CWD_F: 0 } },
      { id: 'o2', output: 'output 1', name: 'أطفال دون السادسة في الجلسات التعليمية', activityIds: ['a_ar4', 'a_ma4', 'a_en4'], measure: 'unique', target: { M: 40, F: 40, CWD_M: 3, CWD_F: 3 } },
      { id: 'o3', output: 'output 2', name: 'أطفال في أنشطة الدعم النفسي', activityIds: ['a_ha', 'a_hs', 'a_hp'], measure: 'unique', target: { M: 70, F: 90, CWD_M: 5, CWD_F: 5 } },
      { id: 'o4', output: 'output 2', name: 'فتيان في الأنشطة الثقافية', activityIds: ['a_dr', 'a_ca'], measure: 'unique' },
      { id: 'o5', output: 'output 3', name: 'حضور الأهالي لجلسات التوعية', activityIds: ['a_aw'], measure: 'sessions-attendance', target: { M: 0, F: 150, CWD_M: 0, CWD_F: 15 } }],
    outcomeIndicators: [{ id: 'oc1', name: '% من الأطفال الذين وصلت ثقتهم بالتعلّم 70% فأكثر', row: 7, formId: 'child_learning', op: '>=', valuePct: 70, round: 'endline', kind: 'threshold', target: { M: 60, F: 60, CWD_M: 50, CWD_F: 50 }, baseline: { M: 30, F: 32, CWD_M: 20, CWD_F: 20 } },
      { id: 'oc2', name: '% من الأطفال الذين تحسّنت درجتهم (قبلي → بعدي)', row: 8, formId: 'child_learning', kind: 'improvement', minGain: 3, target: { M: 70, F: 70, CWD_M: 60, CWD_F: 60 } }],
    directTarget: { M: 400, F: 600, CWD_M: 30, CWD_F: 30 },
    impact: { text: 'تحسين رفاه الأطفال وتعلمهم في دير البلح', indicator: 'نسبة الأطفال الذين يظهرون تحسنًا في الرفاه' },
    info: { code: 'FR-2026-01', title: "FRANCE: A Response to Gaza's Trauma and Education Needs", objective: 'تعزيز التعلم والتعافي النفسي للأطفال المتضررين', summary: 'جلسات تعليمية ونفسية-اجتماعية للأطفال والفتيان والأهالي', manager: 'منسق المشروع', budget: 120000, currency: 'EUR', donorShare: 100000, nawaShare: 20000, directPlanned: 7595, amend: false, sectors: ['Educational', 'Psychosocial Support (Mental Health)', 'Cultural'], partners: ['NGO'], targetGroups: ['Children- School age', 'children pre school', 'Parents'], geo: 'Deir Al Balah', budgetSpent: 54000, reports: [{ from: '2026-01-01', to: '2026-06-30', submit: '2026-07-31', resp: 'MEAL Officer' }] },
    logframe: { 3: { text: 'مساهمة في رفاه الأطفال', ind: 'مؤشر الرفاه', target: '60%', src: 'استبيان', risk: 'استقرار الوضع الأمني' }, 5: { text: 'تحسن التعلم', ind: '% كفاءة رياضيات', target: '60%', src: 'KoBo', risk: 'استمرار الوصول' }, 7: { text: 'خدمات تعليمية للأطفال', ind: 'عدد المستفيدين', target: '5000', src: 'STT', risk: '' }, 8: { text: 'جلسات لغة عربية ورياضيات' } },
    profile: { oc1: { definition: 'نسبة الأطفال فوق العتبة' } },
    meal: { 7: { planned: [4, 8, 12, 16, 20, 24], actual: [4, 8, 12] }, 63: { planned: [26], actual: [26] }, 65: { planned: [48] } },
    assumptions: [{ text: 'استمرار إمكانية الوصول للمراكز', mitigation: 'الجلسات عن بعد', fulfilled: 'ONLY PARTLY', strategy: 'جلسات مدمجة' }],
    learning: [{ result: 'R1', activity: 'Arabic Education', source: 'PDM', rec: 'زيادة الحصص للمجموعات المتأخرة', date: '2026-04-01', action: 'إضافة حصتين', deadline: '2026-05-01', resp: 'المنسق', status: 'in progress' }] }];
  const mk = (n, g, a0, a1, fSh) => { for (let i = 0; i < n; i++) { const sex = rnd() < fSh ? 'F' : 'M', dis = rnd() < 0.06;
    db.beneficiaries.push({ id: `b${db.beneficiaries.length + 1}`, name: `${sex === 'M' ? pick(F1) : pick(F2)} ${pick(F1)} ${pick(F1)} ${pick(FAM)}`, sex, age: ri(a0, a1), disability: dis, ...(dis ? { disabilityType: pick(['حركية', 'سمعية', 'ذهنية']) } : {}), phone: '059' + ri(1e6, 9e6), status: pick(['نازح', 'مقيم']), center: 'c_hub' }); } };
  mk(70, 'c7', 7, 12, 0.64); mk(14, 'c4', 4, 6, 0.5); mk(26, 'y', 13, 15, 0.8); mk(32, 'p', 24, 48, 1);
  const B = db.beneficiaries, kids7 = B.filter((b) => b.age >= 7 && b.age <= 12), kids4 = B.filter((b) => b.age <= 6), youth = B.filter((b) => b.age >= 13 && b.age <= 15), par = B.filter((b) => b.age >= 19);
  // [مركز، نشاط، عدد الجلسات الحقيقي في STT، متوسط الحضور، وضع الإدخال، مجموعة الأسماء]
  const plan = [[C.hub, 'a_ar7', 170, 10.3, 'roll', kids7], [C.hub, 'a_ma7', 168, 11.1, 'roll', kids7], [C.hub, 'a_ha', 63, 9.4, 'roll', kids7], [C.hub, 'a_hs', 63, 12.4, 'roll', kids7], [C.hub, 'a_hp', 21, 11.3, 'roll', kids7],
    [C.hub, 'a_dr', 31, 14, 'roll', youth], [C.hub, 'a_ca', 11, 14.1, 'roll', youth], [C.hub, 'a_aw', 20, 10.8, 'roll', par], [C.hub, 'a_ha', 14, 8.5, 'roll', kids4], [C.hub, 'a_ma4', 6, 6, 'roll', kids4],
    [C.kg, 'a_ar4', 118, 21, 'counts'], [C.kg, 'a_ma4', 98, 21, 'counts'], [C.kg, 'a_en4', 56, 21, 'counts'], [C.kg, 'a_ha', 28, 21, 'counts'], [C.kg, 'a_hs', 28, 20.6, 'counts'], [C.kg, 'a_hp', 17, 21, 'counts']];
  const educ = ['ألماظة العطار', 'منى أبو شمالة', 'رهف الحاج', 'سناء الأسطل'];
  const days = []; for (let m = 0; m < 9; m++) for (let d = 1; d <= 28; d++) { const wd = new Date(Date.UTC(2026, m, d)).getUTCDay(); if (wd !== 5 && wd !== 6) days.push(`2026-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`); }
  let n = 0; const used = new Set(), perDay = new Map(), GRPS = { c_hub: ['أ', 'ب', 'ج'], c_kg: ['روضة 1', 'روضة 2'] };
  for (const [c, a, cnt, avg, mode, pool] of plan) for (let i = 0; i < cnt; i++) {
    let s, key, tries = 0;
    do { s = { id: `s${n + 1}`, projectId: 'p_fr', activityId: a, centerId: c.id, date: pick(days), educator: pick(educ), grp: pick(GRPS[c.id]), mode }; key = [a, c.id, s.date, s.educator, s.grp].join('|'); } while (used.has(key) && ++tries < 200);
    used.add(key); n++;
    if (mode === 'roll') { const k = poisson(avg), dk = `${a}|${s.date}`, taken = perDay.get(dk) || new Set();
      const avail = [...pool].filter((b) => !taken.has(b.id)).sort(() => rnd() - 0.5).slice(0, Math.min(pool.length, k)); avail.forEach((b) => taken.add(b.id)); perDay.set(dk, taken);
      if (!avail.length) { n--; continue; } s.attendance = avail.map((b) => b.id); }
    else { const t = poisson(avg), dM = Math.round(t * 0.6), wd = rnd() < 0.12 ? 1 : 0; s.counts = { M: dM - (wd ? 1 : 0), F: t - dM, MWD: wd, FWD: 0 };
      s.bandCounts = { M: [s.counts.M, 0, 0, 0, 0, 0, 0], F: [s.counts.F, 0, 0, 0, 0, 0, 0], MWD: [s.counts.MWD, 0, 0, 0, 0, 0, 0], FWD: [0, 0, 0, 0, 0, 0, 0] }; }
    db.sessions.push(s);
  }
  // استبيان الثقة بالتعلّم: قبلي (فبراير) وبعدي (يونيو) لأطفال 7–12
  const tpl = TEMPLATES.find((t) => t.id === 'child_learning'), nq = tpl.items.length, mx = nq * 5;
  kids7.forEach((b, i) => { const base = Math.round(mx * (0.45 + rnd() * 0.3)), gain = Math.round(mx * (rnd() * 0.25 - 0.03));
    for (const [round, date, sc] of [['baseline', '2026-02-10', base], ['endline', '2026-06-10', Math.min(mx, base + gain)]]) db.surveyResponses.push({ id: `r_${b.id}_${round}`, uuid: `sim-${b.id}-${round}`, formId: 'child_learning', projectId: 'p_fr', bnfId: b.id, round, date, score: sc, max: mx, answers: { center: 'c_hub' } }); });
  // وسم كل السجلات كمحاكاة لحذفها دفعة واحدة
  for (const k of ['projects', 'centers', 'beneficiaries', 'sessions', 'surveyResponses']) db[k].forEach((r) => { r.demo = true; });
  return db;
}
