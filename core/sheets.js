// كشوفات الحضور الورقية (Word) كنماذج إدخال مقيّدة: ثمانية أنواع، لكل نوع ترويسته وفئاته وقواعد تحققه.
// الكشف = مصدر البيانات؛ الجلسات (STT) تُولَّد منه، فتبقى كل المحركات (BTT/PTT/لوحة القيادة) كما هي.
import { ageAt, catOf, emptyCats, AGE_BANDS, bandOf } from './model.js';
import { V } from './settings.js';

// الفئات المشاركة كما في الكشوفات الورقية (النطاق العمري يُستعمل للتحقق من كل مشارك)
export const SG = {
  c46: { name: 'أطفال (4-6) سنوات', min: 4, max: 6, grp: 'child' },
  c712: { name: 'أطفال (7-12) سنوات', min: 7, max: 12, grp: 'child' },
  y1315: { name: 'يافعين/ات (13-15)', min: 13, max: 15, grp: 'youth' },
  y1618: { name: 'يافعين/ات (16-18)', min: 16, max: 18, grp: 'youth' },
  adult: { name: 'شباب', min: 19, max: 35, grp: 'youth' },
  parents: { name: 'أهالي', min: 19, max: 90, grp: 'parent' },
  edN: { name: 'تربويون/ات النوى', min: 19, max: 70, grp: 'nawaEducator' },
  edG: { name: 'تربويون/ات خريجون جدد', min: 19, max: 70, grp: 'localEducator' },
  edS: { name: 'تربويون/ات المدارس', min: 19, max: 70, grp: 'localEducator' },
  elders: { name: 'كبار السن / أصحاب الرواية', min: 40, max: 100, grp: 'community' },
};
const KIDS = ['c46', 'c712', 'y1315', 'y1618', 'adult'], EDU = ['edN', 'edG', 'edS'];
export const DTYPES = ['سمعية', 'بصرية', 'حركية', 'ذهنية', 'أخرى']; // قابلة للتعديل من الإعدادات (تُعدَّل في مكانها)
const F = (key, label, type = 'text', o = {}) => ({ key, label, type, ...o });
const MODE = [F('mode', 'آلية التنفيذ', 'mode', { req: true })]; // وجاهي (قاعة) | إلكتروني (منصة)
const TIME = [F('from', 'من الساعة', 'time', { req: true }), F('to', 'حتى الساعة', 'time', { req: true })];

export const KINDS = {
  course: { name: 'دورة (أطفال / يافعين / شباب)', multi: true, groups: KIDS,
    lists: [{ key: 'roster', label: 'المشاركون', age: true, allowed: KIDS }],
    fields: [F('title', 'عنوان الدورة', 'text', { req: true }), F('type', 'نوع الدورة', 'select', { req: true, opts: ['تعليمية', 'فنية', 'ثقافية', 'دعم نفسي واجتماعي', 'رياضية/حركية', 'ترفيهية', 'أخرى'] }), F('facilitator', 'اسم المنشط/ة - المدرب/ة', 'text', { req: true }),
      F('start', 'تاريخ بدء الدورة', 'date', { req: true }), F('end', 'تاريخ انتهاء الدورة', 'date', { req: true }), F('hours', 'عدد الساعات التدريبية', 'number', { req: true, min: 0.5, max: 500 }), F('meetings', 'إجمالي عدد لقاءات الدورة', 'int', { req: true, min: 1, max: 200 }),
      ...TIME, ...MODE, F('booklet', 'المطوية (إن وجد)'), F('mandatoryPct', 'نسبة الحضور الإلزامية %', 'int', { req: true, min: 0, max: 100 })] },
  edu: { name: 'تدريبات تربويين/ات', multi: true, groups: EDU,
    lists: [{ key: 'roster', label: 'المتدربون', age: false, allowed: EDU }],
    fields: [F('title', 'موضوع التدريب', 'text', { req: true }), F('type', 'نوع التدريب', 'select', { req: true, opts: ['تدريب', 'ورشة عمل', 'لقاء تعلّم مهني', 'أخرى'] }), F('facilitator', 'المدرب/ة'),
      F('start', 'تاريخ البدء', 'date', { req: true }), F('end', 'تاريخ الانتهاء', 'date', { req: true }), F('hours', 'إجمالي ساعات التدريب', 'number', { req: true, min: 0.5, max: 500 }), F('meetings', 'إجمالي عدد اللقاءات', 'int', { req: true, min: 1, max: 200 }),
      ...TIME, ...MODE, F('mandatoryPct', 'نسبة الحضور الإلزامية %', 'int', { req: true, min: 0, max: 100 })] },
  parents: { name: 'تدريبات أهالي', multi: true, groups: ['parents'],
    lists: [{ key: 'roster', label: 'الأهالي', age: false, allowed: ['parents'] }],
    fields: [F('title', 'اسم الدورة التدريبية', 'text', { req: true }), F('type', 'نوع الدورة التدريبية', 'select', { req: true, opts: ['توعوية', 'تدريبية', 'دعم نفسي واجتماعي', 'أخرى'] }), F('facilitator', 'اسم المدرب/ة', 'text', { req: true }),
      F('start', 'تاريخ بدء الدورة', 'date', { req: true }), F('end', 'تاريخ انتهاء الدورة', 'date', { req: true }), F('meetings', 'إجمالي عدد الجلسات', 'int', { req: true, min: 1, max: 200 }),
      ...TIME, ...MODE, F('booklet', 'المطوية (إن وجد)')] },
  activity: { name: 'نشاط', multi: false, groups: KIDS,
    lists: [{ key: 'roster', label: 'المشاركون', age: true, allowed: KIDS }],
    fields: [F('title', 'اسم النشاط', 'text', { req: true }), F('type', 'نوع النشاط', 'select', { req: true, opts: ['تعليمي', 'فني', 'ثقافي', 'دعم نفسي واجتماعي', 'رياضي/حركي', 'ترفيهي', 'أخرى'] }), F('facilitator', 'اسم المنشط/ة', 'text', { req: true }),
      F('date', 'تاريخ تنفيذ النشاط', 'date', { req: true }), ...TIME, ...MODE, F('booklet', 'المطوية (إن وجد)')] },
  openday: { name: 'يوم مفتوح', multi: false, groups: [...KIDS, 'parents', ...EDU],
    lists: [{ key: 'roster', label: 'المشاركون', age: true, allowed: [...KIDS, 'parents', ...EDU] }],
    fields: [F('activities', 'أسماء الأنشطة (حتى 4)', 'lines', { req: true, max: 4 }), F('facilitators', 'أسماء المنشطين/ات (حتى 4)', 'lines', { req: true, max: 4 }), F('type', 'نوع النشاط', 'text', { req: true }),
      F('date', 'تاريخ التنفيذ', 'date', { req: true }), ...TIME, F('venue', 'مكان تنفيذ النشاط (القاعة)', 'text', { req: true }), F('booklet', 'المطوية (إن وجد)')] },
  trip: { name: 'رحلة', multi: false, groups: [...KIDS, 'parents', ...EDU],
    lists: [{ key: 'roster', label: 'المشاركون', age: true, allowed: [...KIDS, 'parents', ...EDU] }],
    fields: [F('type', 'نوع الرحلة', 'text', { req: true }), F('date', 'تاريخ تنفيذ الرحلة', 'date', { req: true }), F('facilitator', 'المسؤول عن الرحلة', 'text', { req: true }), ...TIME,
      F('place', 'مكان تنفيذ الرحلة', 'text', { req: true }), F('booklet', 'المطوية (إن وجد)')] },
  visit: { name: 'زيارة (زوار)', multi: false, groups: [...KIDS, 'parents'], guests: true,
    lists: [{ key: 'guests', label: 'الزائرون', age: true, allowed: [...KIDS, 'parents'], inline: true }],
    fields: [F('activities', 'أسماء الأنشطة (حتى 3)', 'lines', { req: true, max: 3 }), F('facilitators', 'أسماء المنشطين (حتى 3)', 'lines', { req: true, max: 3 }), F('date', 'تاريخ الزيارة', 'date', { req: true }), ...TIME,
      F('type', 'نوع الزيارة', 'text', { req: true }), F('booklet', 'المطوية (إن وجد)'), F('venue', 'مكان استضافة الجهة الزائرة (القاعة)', 'text', { req: true }),
      F('body', 'اسم الجهة الزائرة', 'text', { req: true }), F('contact', 'شخص التواصل', 'text', { req: true }), F('contactPhone', 'رقم التواصل', 'tel', { req: true }), F('companions', 'أسماء المرافقين (حتى 3)', 'lines', { max: 3 })] },
  interview: { name: 'مقابلة توثيق تراث شفوي', multi: false, groups: ['elders'], guests: true,
    lists: [{ key: 'guests', label: 'المُحاوَرون', age: true, allowed: ['elders'], inline: true }],
    fields: [F('title', 'موضوع المقابلة / الرواية', 'text', { req: true }), F('type', 'نوع المادة', 'select', { req: true, opts: ['رواية شفوية', 'قصة وحكاية', 'تراث مادي', 'عادات وتقاليد', 'أخرى'] }), F('facilitator', 'اسم الباحث/ة الميداني', 'text', { req: true }),
      F('date', 'تاريخ المقابلة', 'date', { req: true }), ...TIME, F('place', 'مكان المقابلة', 'text', { req: true }), F('consent', 'الموافقة على التسجيل والنشر', 'select', { req: true, opts: ['موافقة كاملة (تسجيل ونشر)', 'تسجيل دون نشر', 'بلا تسجيل (تدوين فقط)'] }), F('recordRef', 'رمز التسجيل/الملف في الأرشيف')] },
  joint: { name: 'نشاط مشترك (أهالي + أطفال)', multi: false, groups: ['c46', 'c712', 'y1315', 'y1618', 'parents'],
    lists: [{ key: 'roster', label: 'الأطفال / اليافعون', age: true, allowed: ['c46', 'c712', 'y1315', 'y1618'] }, { key: 'rosterP', label: 'الأهالي', age: false, allowed: ['parents'] }],
    fields: [F('title', 'اسم النشاط', 'text', { req: true }), F('type', 'نوع النشاط', 'select', { req: true, opts: ['تعليمي', 'فني', 'ثقافي', 'دعم نفسي واجتماعي', 'ترفيهي', 'أخرى'] }), F('facilitator', 'اسم المنشط/ة', 'text', { req: true }),
      F('date', 'تاريخ النشاط', 'date', { req: true }), ...TIME, ...MODE, F('booklet', 'المطوية (إن وجد)')] },
};

export const newSheet = (kind, projectId, centerId) => ({ id: 'sh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, projectId, activityId: null, centerId: centerId || null, meta: { groups: [], mode: 'inperson' }, roster: [], rosterP: [], guests: [], meetings: [{ n: 1, date: '', present: [] }] });

export const allIds = (sh) => [...new Set([...(sh.roster || []), ...(sh.rosterP || [])])];
const hm = (t) => (/^\d{1,2}:\d{2}$/.test(t || '') ? +t.split(':')[0] * 60 + +t.split(':')[1] : null);
export const phoneOk = (p) => !p || /^05[69]\d{7}$/.test(String(p).replace(/[\s-]/g, ''));
export const nameOk = (n) => String(n || '').trim().split(/\s+/).filter(Boolean).length >= V('nameMinWords');

// الأشخاص في كشف: مرجع مستفيد أو زائر مضمَّن
export function peopleOf(sh, db) {
  const m = new Map(db.beneficiaries.map((b) => [b.id, b])); const out = [];
  for (const L of KINDS[sh.kind].lists) {
    if (L.inline) (sh.guests || []).forEach((g, i) => out.push({ list: L.key, id: 'g' + i, name: g.name, sex: g.sex, age: g.age, disability: !!g.disability, dtype: g.dtype, dtypeOther: g.dtypeOther, phone: g.phone, guest: true }));
    else for (const id of sh[L.key] || []) { const b = m.get(id); out.push(b ? { list: L.key, id, name: b.name, sex: b.sex, age: b.age ?? null, bnf: b, disability: !!b.disability, dtypeOther: b.disabilityOther, dtype: b.disabilityType, phone: b.phone } : { list: L.key, id, missing: true }); }
  }
  return out;
}
// اللقاءات المنفَّذة فعلاً (لها تاريخ)
export const heldMeetings = (sh) => (sh.meetings || []).filter((m) => m.date);
// الحضور الفعلي لكل شخص عبر اللقاءات (للكشف متعدد اللقاءات)؛ الكشوف الأحادية: الكل حاضر
export function presentIds(sh) {
  if (!KINDS[sh.kind].multi) return KINDS[sh.kind].guests ? [] : allIds(sh);
  return [...new Set(heldMeetings(sh).flatMap((m) => m.present))];
}
// الأعداد المشتقة للترويسة («عدد الحضور» و«نوع الإعاقة») — لا تُكتب يدوياً أبداً
export function derivedCounts(sh, db) {
  const att = new Set(presentIds(sh)), multi = KINDS[sh.kind].multi, c = emptyCats(), types = {}; let n = 0;
  for (const p of peopleOf(sh, db)) {
    if (p.missing || (!p.guest && multi && !att.has(p.id))) continue;
    c[catOf(p.sex, p.disability)]++; n++; if (p.disability) types[p.dtype || '؟'] = (types[p.dtype || '؟'] || 0) + 1;
  }
  return { total: n, M: c.M + c.CWD_M, F: c.F + c.CWD_F, MWD: c.CWD_M, FWD: c.CWD_F, types, cats: c };
}
// نسبة حضور كل مشارك في الكشف متعدد اللقاءات ومدى استيفائه نسبة الحضور الإلزامية
export function completion(sh, db) {
  const held = heldMeetings(sh); const need = sh.meta.mandatoryPct ?? null;
  return peopleOf(sh, db).filter((p) => !p.missing && !p.guest).map((p) => { const k = held.filter((m) => m.present.includes(p.id)).length, pct = held.length ? Math.round((k / held.length) * 100) : 0; return { ...p, attended: k, held: held.length, pct, ok: need == null ? null : pct >= need }; });
}

function ageRanges(sh, L) { const g = (sh.meta.groups || []).filter((k) => L.allowed.includes(k)); return g.map((k) => SG[k]); }

// ---- التحقق: errors تمنع الحفظ، warnings تحتاج تأكيداً ----
export function validateSheet(sh, db, { today = new Date().toISOString().slice(0, 10), others = db.sessions } = {}) {
  const K = KINDS[sh.kind], m = sh.meta || {}, er = [], wa = [], p = db.projects.find((x) => x.id === sh.projectId);
  const E = (t) => er.push(t), W = (t) => wa.push(t);
  if (!p) { E('اختر المشروع'); return { errors: er, warnings: wa }; }
  if (!sh.activityId || !p.activities.some((a) => a.id === sh.activityId)) E('اربط الكشف بنشاط من أنشطة المشروع');
  if (!sh.centerId || !db.centers.some((c) => c.id === sh.centerId)) E('اختر المركز');
  for (const f of K.fields) {
    const v = m[f.key]; const empty = f.type === 'lines' ? !(v || []).filter(Boolean).length : v == null || String(v).trim() === '';
    if (f.type === 'mode') { if (!m.mode) E('اختر آلية التنفيذ'); else if (!(m.venue || '').trim()) E(m.mode === 'online' ? 'اكتب المنصة المستخدمة (زوم/تيمز…)' : 'اكتب مكان التنفيذ (القاعة)'); continue; }
    if (f.req && empty) { E(`«${f.label}» مطلوب`); continue; }
    if (empty) continue;
    if ((f.type === 'number' || f.type === 'int') && (isNaN(+v) || +v < f.min || +v > f.max || (f.type === 'int' && !Number.isInteger(+v)))) E(`«${f.label}» يجب أن يكون ${f.type === 'int' ? 'عدداً صحيحاً' : 'رقماً'} بين ${f.min} و${f.max}`);
    if (f.type === 'tel' && !phoneOk(v)) E(`«${f.label}» غير صالح (يبدأ بـ 059 أو 056 ويتكون من 10 أرقام)`);
    if (f.type === 'lines' && (v || []).filter(Boolean).length > f.max) E(`«${f.label}»: الحد الأقصى ${f.max}`);
  }
  if (!(m.groups || []).length) E('اختر الفئة المشاركة');
  // التواريخ والأوقات
  const dates = K.multi ? [m.start, m.end] : [m.date];
  for (const d of dates) if (d && p.start && (d < p.start || d > p.end)) E(`التاريخ ${d} خارج مدة المشروع (${p.start} → ${p.end})`);
  if (K.multi && m.start && m.end && m.end < m.start) E('تاريخ الانتهاء قبل تاريخ البدء');
  const a = hm(m.from), b = hm(m.to);
  if (a != null && b != null) { if (b <= a) E('وقت النهاية يجب أن يكون بعد وقت البداية'); else { if (b - a > V('maxSessionHours') * 60) W(`مدة الجلسة أكثر من ${V('maxSessionHours')} ساعات`); if (K.multi && m.hours && m.meetings) { const per = (m.hours / m.meetings) * 60; if (Math.abs(per - (b - a)) > Math.max(30, (b - a) * 0.5)) W(`ساعات الدورة (${m.hours}) على ${m.meetings} لقاء = ${(per / 60).toFixed(1)} ساعة للقاء، بينما الوقت المسجَّل ${((b - a) / 60).toFixed(1)} ساعة`); } } }
  if ((a != null && (a < V('dayStartHour') * 60 || a > V('lastStartHour') * 60)) || (b != null && b > V('dayEndHour') * 60)) W(`وقت الجلسة خارج الدوام المعتاد (${V('dayStartHour')}:00–${V('dayEndHour')}:00)`);
  // اللقاءات
  const held = heldMeetings(sh), seenD = new Set();
  if (K.multi) {
    if (!held.length) E('سجّل تاريخ لقاء واحد على الأقل');
    if (m.meetings && held.length > m.meetings) E(`عدد اللقاءات المسجَّلة (${held.length}) أكثر من الإجمالي (${m.meetings})`);
    for (const x of sh.meetings) {
      if (!x.date) { if (x.present.length) E(`اللقاء ${x.n}: حضور بلا تاريخ`); continue; }
      if (seenD.has(x.date)) E(`تاريخ اللقاء ${x.n} مكرر (${x.date})`); seenD.add(x.date);
      if (x.date > today) E(`اللقاء ${x.n}: تاريخ مستقبلي (${x.date}) — لا يُسجَّل حضور قبل حدوثه`);
      if (m.start && x.date < m.start || m.end && x.date > m.end) E(`اللقاء ${x.n}: التاريخ ${x.date} خارج مدة الدورة`);
      if (!x.present.length) E(`اللقاء ${x.n} (${x.date}) بلا أي حاضر`);
    }
  } else if (m.date && m.date > today) E('تاريخ النشاط مستقبلي — لا يُسجَّل حضور قبل حدوثه');
  // المشاركون
  const ppl = peopleOf(sh, db); const names = new Map();
  if (!ppl.length) E(K.guests ? 'أضف زائراً واحداً على الأقل' : 'أضف مشاركاً واحداً على الأقل');
  for (const L of K.lists) {
    const rg = ageRanges(sh, L); if (!rg.length && (m.groups || []).length) E(`«${L.label}»: الفئة المختارة أعلاه لا تتضمن فئة مناسبة لهذه القائمة`);
    for (const pr of ppl.filter((x) => x.list === L.key)) {
      if (pr.missing) { E('مشارك محذوف من سجل المستفيدين'); continue; }
      const tag = pr.name || 'بلا اسم';
      if (!nameOk(pr.name)) E(`الاسم «${tag}» أقل من ثلاثة مقاطع`);
      if (pr.sex !== 'M' && pr.sex !== 'F') E(`${tag}: الجنس غير محدد`);
      if (pr.disability && !pr.dtype) E(`${tag}: إعاقة بلا تحديد النوع`);
      if (pr.phone && !phoneOk(pr.phone)) W(`${tag}: رقم هاتف غير صالح`);
      const key = `${String(pr.name).trim()}|${pr.sex}`; if (names.has(key)) E(`${tag}: مكرر في الكشف`); names.set(key, 1);
      const age = pr.guest ? pr.age : pr.bnf ? ageAt(pr.bnf, m.date || m.start || today) : null;
      if (L.age) {
        if (age == null || isNaN(age)) E(`${tag}: العمر مطلوب`);
        else if (rg.length && !rg.some((g) => age >= g.min && age <= g.max)) E(`${tag}: العمر ${age} خارج الفئات المختارة (${rg.map((g) => g.name).join(' / ')})`);
        else if (!bandOf(age)) (pr.guest ? E : W)(`${tag}: العمر ${age} خارج الفئات العمرية للقالب`);
      }
    }
  }
  if (K.multi) for (const c of completion(sh, db)) if (c.held && !c.attended) W(`${c.name}: مسجَّل في الدورة بلا أي حضور`);
  // ازدواج الحضور: نفس الشخص في جلسة أخرى بالتاريخ والوقت نفسهما
  if (a != null && b != null) {
    const mine = new Set(sh.id ? [sh.id] : []); const dts = K.multi ? held.map((x) => x.date) : [m.date];
    const ids = new Set(ppl.filter((x) => !x.guest).map((x) => x.id));
    for (const s of others) { if (!s.attendance || mine.has(s.sheetId) || !dts.includes(s.date) || s.from == null) continue; const sa = hm(s.from), sb = hm(s.to); if (sa == null || sb == null || sb <= sa || Math.max(a, sa) >= Math.min(b, sb)) continue;
      const clash = s.attendance.filter((id) => ids.has(id)).length; if (clash) W(`${clash} مشارك مسجَّلون في جلسة أخرى بالتوقيت نفسه (${s.date} ${s.from}–${s.to})`); }
  }
  if (K.guests && m.contactPhone && !phoneOk(m.contactPhone)) { /* نُبّه أعلاه عبر الحقل */ }
  return { errors: er, warnings: wa };
}

// ---- توليد جلسات STT من الكشف ----
export function sheetSessions(sh, db) {
  const K = KINDS[sh.kind], m = sh.meta, base = { projectId: sh.projectId, activityId: sh.activityId, centerId: sh.centerId, educator: m.facilitator || (m.facilitators || [])[0] || '', sheetId: sh.id, kind: sh.kind, from: m.from || null, to: m.to || null, units: 1, notes: m.title || m.type || '', ...(sh.demo ? { demo: true } : {}) };
  const meetings = K.multi ? heldMeetings(sh) : [{ n: 1, date: m.date, present: allIds(sh) }];
  if (K.guests) {
    const g = sh.guests || [], bc = { M: [], F: [], MWD: [], FWD: [] }; for (const k in bc) bc[k] = AGE_BANDS.map(() => 0);
    for (const x of g) { const k = x.sex === 'M' ? (x.disability ? 'MWD' : 'M') : x.disability ? 'FWD' : 'F', bi = AGE_BANDS.findIndex((bd) => x.age >= bd.min && x.age <= bd.max); if (bi >= 0) bc[k][bi]++; }
    const cnt = (k) => bc[k].reduce((x, y) => x + y, 0), counts = { M: cnt('M'), F: cnt('F'), MWD: cnt('MWD'), FWD: cnt('FWD') };
    return [{ ...base, id: `${sh.id}_m1`, meeting: 1, date: m.date, mode: 'counts', counts, bandCounts: bc }];
  }
  return meetings.map((x) => ({ ...base, id: `${sh.id}_m${x.n}`, meeting: x.n, date: x.date, mode: 'roll', attendance: [...new Set(x.present)] }));
}
// يحفظ الكشف ويستبدل جلساته في db
export function commitSheet(db, sh) {
  const i = db.sheets.findIndex((x) => x.id === sh.id); if (i >= 0) db.sheets[i] = sh; else db.sheets.push(sh);
  db.sessions = db.sessions.filter((s) => s.sheetId !== sh.id); db.sessions.push(...sheetSessions(sh, db)); return sh;
}
export function removeSheet(db, id) { db.sheets = db.sheets.filter((x) => x.id !== id); db.sessions = db.sessions.filter((s) => s.sheetId !== id); }
