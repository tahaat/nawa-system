import { inferBands, context, sessionCats, sumCats, sttRows, bttRows, outputMonthly, breakdown, workplanActual, dashboard } from './aggregate.js';
import { ageAt, monthIdx, bandOf, CATS } from './model.js';

const issue = (level, code, msg, ref) => ({ level, code, msg, ref });

// ---- التحقق عند الإدخال/الحفظ (قواعد على مستوى السجل) ----
export function validateEntry(db) {
  const cx = context(db), out = [], seenKey = new Map();
  for (const p of db.projects) {
    if (!p.start || !p.end) out.push(issue('error', 'P01', `المشروع «${p.name}» بلا تاريخ بداية/نهاية`, p.id));
    for (const a of p.activities) {
      if (!p.interventions?.some((i) => i.id === a.interventionId)) out.push(issue('error', 'P02', `النشاط «${a.name}» غير مرتبط ببند في تفصيل المستفيدين`, a.id));
    }
    for (const o of p.outputIndicators || []) if (!o.activityIds?.length) out.push(issue('warn', 'P03', `مؤشر المخرجات «${o.name}» غير مرتبط بأي نشاط`, o.id));
  }
  for (const b of db.beneficiaries) {
    if (!b.name || b.name.trim().split(/\s+/).length < 2) out.push(issue('info', 'B02', `اسم مختصر: ${b.name}`, b.id));
    if (b.sex !== 'M' && b.sex !== 'F') out.push(issue('error', 'B04', `جنس غير محدد: ${b.name}`, b.id));
    if (!b.dob && b.age == null) out.push(issue('error', 'B01', `لا عمر/تاريخ ميلاد: ${b.name}`, b.id));
    if (b.disability && !b.disabilityType) out.push(issue('warn', 'B08', `إعاقة بلا نوع: ${b.name}`, b.id));
    if (b.phone && !/^05\d{8}$/.test(String(b.phone))) out.push(issue('warn', 'B03', `هاتف غير صالح: ${b.name}`, b.id));
  }
  // تكرار محتمل للمستفيدين: نفس الاسم + نفس الجنس
  const nm = new Map();
  for (const b of db.beneficiaries) { const k = `${(b.name || '').trim()}|${b.sex}`; nm.set(k, [...(nm.get(k) || []), b]); }
  for (const [k, v] of nm) if (v.length > 1) out.push(issue('warn', 'B05', `اسم مكرر محتمل (${v.length}): ${v[0].name}`, v.map((x) => x.id).join(',')));
  for (const s of db.sessions) {
    const p = cx.proj.get(s.projectId), a = cx.act.get(s.activityId);
    if (!p) { out.push(issue('error', 'S00', 'جلسة بلا مشروع', s.id)); continue; }
    if (!a || a.project.id !== p.id) out.push(issue('error', 'S01', `نشاط الجلسة لا يتبع مشروعها (${s.date})`, s.id));
    if (!cx.ctr.get(s.centerId)) out.push(issue('error', 'S02', `جلسة بلا مركز (${s.date})`, s.id));
    if (s.date < p.start || s.date > p.end) out.push(issue('error', 'S03', `تاريخ الجلسة ${s.date} خارج مدة المشروع`, s.id));
    if (!s.educator) out.push(issue('warn', 'S04', `جلسة بلا منشّط (${a?.name} ${s.date})`, s.id));
    const ids = s.attendance || [];
    if (s.mode === 'roll') {
      if (new Set(ids).size !== ids.length) out.push(issue('error', 'S05', `اسم مكرر داخل نفس الجلسة (${s.date})`, s.id));
      for (const id of ids) {
        const b = cx.bnf.get(id);
        if (!b) { out.push(issue('error', 'S06', `حضور لمستفيد غير موجود في السجل (${id})`, s.id)); continue; }
        const age = ageAt(b, s.date);
        if (a?.ageMin != null && age != null && (age < a.ageMin || age > a.ageMax)) out.push(issue('warn', 'S07', `عمر ${b.name} (${age}) خارج فئة النشاط «${a.name}» (${a.ageMin}-${a.ageMax})`, s.id));
        if (age != null && !bandOf(age)) out.push(issue('warn', 'S08', `عمر ${b.name} (${age}) خارج الفئات العمرية للقالب`, s.id));
      }
    } else {
      const c = s.counts || {};
      if (![c.M, c.F, c.MWD, c.FWD].every((n) => Number.isInteger(n || 0) && (n || 0) >= 0)) out.push(issue('error', 'S09', `أعداد غير صحيحة (${s.date})`, s.id));
      if (!s.bandCounts && !inferBands(a || {}, s.counts || {})) out.push(issue('info', 'S10', `جلسة بالأعداد بلا توزيع عمري: لن تدخل في تفصيل الفئات العمرية (${a?.name} ${s.date})`, s.id));
      else if (s.bandCounts) {
        for (const [k, kk] of [['M', 'M'], ['F', 'F'], ['MWD', 'MWD'], ['FWD', 'FWD']]) {
          const sum = (s.bandCounts[k] || []).reduce((x, y) => x + y, 0);
          if (sum !== (c[kk] || 0)) out.push(issue('error', 'S11', `مجموع الفئات العمرية (${k}) لا يساوي العدد (${sum} ≠ ${c[kk] || 0}) في ${s.date}`, s.id));
        }
      }
    }
    if (sumCats(sessionCats(s, cx)) === 0) out.push(issue('error', 'S12', `جلسة بلا حضور (${a?.name} ${s.date})`, s.id));
    const key = [s.projectId, s.activityId, s.centerId, s.date, s.educator, s.grp || ''].join('|');
    if (seenKey.has(key)) out.push(issue('warn', 'S13', `جلسة مكررة محتملة: ${a?.name} ${s.date} (${s.educator})`, s.id));
    seenKey.set(key, s.id);
  }
  const dupR = new Map();
  for (const r of db.surveyResponses || []) {
    if (!cx.bnf.get(r.bnfId)) out.push(issue('error', 'O01', `ردّ استبيان لرمز غير موجود في السجل: ${r.bnfId}`, r.id));
    const k = `${r.formId}|${r.bnfId}|${r.round}`; if (dupR.has(k)) out.push(issue('warn', 'O02', `ردّ مكرر (${r.formId} / ${r.bnfId} / ${r.round})`, r.id)); dupR.set(k, 1);
    if (!r.date) out.push(issue('warn', 'O03', `ردّ بلا تاريخ: ${r.bnfId}`, r.id));
  }
  for (const p of db.projects) for (const o of p.outcomeIndicators || []) if (!o.formId) out.push(issue('warn', 'O04', `مؤشر نتائج «${o.name}» غير مرتبط باستبيان`, o.id));
  // مستفيد في جلستين لنفس النشاط في اليوم نفسه
  const dd = new Map();
  for (const s of db.sessions) if (s.mode === 'roll') for (const id of new Set(s.attendance || [])) { const k = `${id}|${s.activityId}|${s.date}`; dd.set(k, (dd.get(k) || 0) + 1); }
  for (const [k, n] of dd) if (n > 1) out.push(issue('warn', 'S14', `مستفيد في ${n} جلسات لنفس النشاط في اليوم نفسه (${k.split('|')[2]})`, k));
  return out;
}

// ---- فحص التكامل بين الأدوات الثلاث (PTT = f(STT, BTT)) ----
export function reconcile(db) {
  const out = [], cx = context(db);
  const stt = sttRows(db), btt = bttRows(db);
  for (const p of db.projects) {
    const tag = `«${p.name}»`;
    const rows = stt.filter((r) => r.project === p.name);
    const dash = dashboard(p, db);
    // 1) STT ↔ لوحة القيادة
    const sttAtt = rows.reduce((a, r) => a + r.total, 0);
    if (sttAtt !== dash.attendance) out.push(issue('error', 'X01', `${tag}: مجموع الحضور في STT (${sttAtt}) ≠ لوحة القيادة (${dash.attendance})`, p.id));
    // 2) STT ↔ BTT (جلسات كشف الأسماء)
    const rollAtt = rows.filter((r) => r.mode === 'roll').reduce((a, r) => a + r.total, 0);
    const bttAtt = btt.reduce((a, b) => a + Object.entries(b.attendance).filter(([act]) => cx.act.get(act)?.project.id === p.id).reduce((x, [, n]) => x + n, 0), 0);
    const rollWeighted = db.sessions.filter((s) => s.projectId === p.id && s.mode === 'roll').reduce((a, s) => a + new Set(s.attendance).size * (s.units || 1), 0);
    if (rollWeighted !== bttAtt) out.push(issue('error', 'X02', `${tag}: حضور كشف الأسماء في STT (${rollWeighted}) ≠ مجموع حضور المستفيدين في BTT (${bttAtt})`, p.id));
    // 3) PTT/المخرجات ↔ STT
    for (const o of outputMonthly(p, db)) {
      const tot = o.months.reduce((a, m) => a + CATS.reduce((x, k) => x + m[k], 0), 0);
      const acts = new Set(o.ind.activityIds);
      const sttSum = db.sessions.filter((s) => s.projectId === p.id && acts.has(s.activityId) && monthIdx(p, s.date) >= 0 && monthIdx(p, s.date) < 12).reduce((a, s) => a + sumCats(sessionCats(s, cx)), 0);
      if (o.ind.measure === 'sessions-attendance' && tot !== sttSum) out.push(issue('error', 'X03', `${tag} مؤشر «${o.ind.name}»: ${tot} في PTT ≠ ${sttSum} في STT`, o.ind.id));
      if (tot > sttSum) out.push(issue('error', 'X04', `${tag} مؤشر «${o.ind.name}»: المستفيدون الفريدون (${tot}) أكثر من إجمالي الحضور (${sttSum})`, o.ind.id));
    }
    // 4) تفصيل المستفيدين: المصنّف + غير المصنّف = الفريد لكل (ربع، بند)
    const bd = breakdown(p, db); const placed = Object.values(bd.cells).reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0);
    const expected = new Set();
    let expectedCounts = 0;
    for (const s of db.sessions) {
      if (s.projectId !== p.id) continue; const a = cx.act.get(s.activityId); const m = monthIdx(p, s.date); if (!a || m < 0 || m > 11) continue;
      if (s.mode === 'roll') for (const id of new Set(s.attendance)) { if (cx.bnf.get(id)) expected.add(`${Math.floor(m / 3)}|${a.interventionId}|${id}`); }
      else expectedCounts += sumCats(sessionCats(s, cx));
    }
    if (placed + bd.unclassified !== expected.size + expectedCounts) out.push(issue('error', 'X05', `${tag}: تفصيل المستفيدين (${placed}+${bd.unclassified}) ≠ المتوقع (${expected.size + expectedCounts})`, p.id));
    if (bd.unclassified) out.push(issue('warn', 'X06', `${tag}: ${bd.unclassified} مشارك بلا فئة عمرية — لن يظهروا في جدول الفئات العمرية`, p.id));
    // 5) خطة العمل: الفعلي = عدد جلسات STT داخل السنة الأولى
    const wp = workplanActual(p, db); const wpSum = [...wp.values()].reduce((a, arr) => a + arr.reduce((x, y) => x + y, 0), 0);
    const inWin = db.sessions.filter((s) => s.projectId === p.id && monthIdx(p, s.date) >= 0 && monthIdx(p, s.date) < 12).reduce((a, s) => a + (s.units || 1), 0);
    if (wpSum !== inWin) out.push(issue('error', 'X07', `${tag}: الفعلي في خطة العمل (${wpSum}) ≠ جلسات STT (${inWin})`, p.id));
    const outside = db.sessions.filter((s) => s.projectId === p.id && (monthIdx(p, s.date) < 0 || monthIdx(p, s.date) > 11)).length;
    if (outside) out.push(issue('warn', 'X08', `${tag}: ${outside} جلسة خارج الأشهر الـ12 الأولى للقالب — لن تظهر في PTT`, p.id));
    // 6) المستفيد المباشر ⊆ المسجَّل بحضور
    if (dash.directCount > dash.uniqueRolled) out.push(issue('error', 'X09', `${tag}: المباشرون (${dash.directCount}) > الفريدون (${dash.uniqueRolled})`, p.id));
  }
  return out;
}
