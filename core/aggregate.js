import { AGE_BANDS, CATS, catOf, emptyCats, ageAt, bandOf, monthIdx, quarterOf, weekOfMonth, iso } from './model.js';

const byId = (arr) => new Map(arr.map((x) => [x.id, x]));

export function context(db) {
  return { ...db, bnf: byId(db.beneficiaries), act: new Map(db.projects.flatMap((p) => p.activities.map((a) => [a.id, { ...a, project: p }]))) , proj: byId(db.projects), ctr: byId(db.centers) };
}

// ---- الحضور لكل جلسة (يوحّد وضعي كشف الأسماء والأعداد) ----
export function sessionCats(s, cx) {
  if (s.mode === 'counts') {
    const c = s.counts || {};
    return { M: c.M || 0, F: c.F || 0, CWD_M: c.MWD || 0, CWD_F: c.FWD || 0 };
  }
  const r = emptyCats();
  for (const id of new Set(s.attendance || [])) {
    const b = cx.bnf.get(id); if (!b) continue;
    r[catOf(b.sex, b.disability)]++;
  }
  return r;
}
export const sumCats = (c) => c.M + c.F + c.CWD_M + c.CWD_F;

// ---- STT: صف لكل جلسة ----
export function sttRows(db, projectId) {
  const cx = context(db);
  return db.sessions.filter((s) => !projectId || s.projectId === projectId).map((s) => {
    const a = cx.act.get(s.activityId) || {}, p = cx.proj.get(s.projectId) || {};
    const c = sessionCats(s, cx);
    return { id: s.id, date: s.date, year: s.date.slice(0, 4), center: cx.ctr.get(s.centerId)?.name || '', project: p.name || '', donor: p.donor || '',
      activity: a.name || '', type: a.type || '', group: a.group || '', sessions: s.units || 1, male: c.M, female: c.F, mwd: c.CWD_M, fwd: c.CWD_F, total: sumCats(c), educator: s.educator || '', mode: s.mode, notes: [s.grp ? `مجموعة ${s.grp}` : '', s.notes || ''].filter(Boolean).join(' — ') };
  });
}

// ---- BTT: لكل مستفيد عدد حضوره في كل نشاط ----
export function bttRows(db, projectId) {
  const cx = context(db), per = new Map();
  for (const s of db.sessions) {
    if (projectId && s.projectId !== projectId || s.mode !== 'roll') continue;
    for (const id of new Set(s.attendance || [])) {
      const m = per.get(id) || new Map(); m.set(s.activityId, (m.get(s.activityId) || 0) + (s.units || 1)); per.set(id, m);
    }
  }
  return db.beneficiaries.filter((b) => per.has(b.id) || !projectId).map((b) => ({ ...b, attendance: Object.fromEntries(per.get(b.id) || []), totalSessions: [...(per.get(b.id) || new Map()).values()].reduce((x, y) => x + y, 0) }));
}

// ---- تعريف المستفيد المباشر (قابل للضبط لكل مشروع) ----
export function directBeneficiaries(project, db) {
  const rule = project.directRule || { mode: 'once' };
  const cx = context(db), counts = new Map(), actTotals = new Map();
  for (const s of db.sessions) {
    if (s.projectId !== project.id) continue;
    actTotals.set(s.activityId, (actTotals.get(s.activityId) || 0) + (s.units || 1));
    if (s.mode !== 'roll') continue;
    for (const id of new Set(s.attendance || [])) {
      const k = id + '|' + s.activityId; counts.set(k, (counts.get(k) || 0) + (s.units || 1));
    }
  }
  const direct = new Set(), people = new Set([...counts.keys()].map((k) => k.split('|')[0]));
  for (const id of people) {
    const e = db.enrollments.find((x) => x.projectId === project.id && x.beneficiaryId === id);
    if (rule.mode === 'manual') { if (e?.direct) direct.add(id); continue; }
    if (e?.direct === true) { direct.add(id); continue; }
    if (e?.direct === false) continue;
    for (const [k, n] of counts) {
      if (!k.startsWith(id + '|')) continue;
      const act = k.split('|')[1];
      const need = rule.mode === 'once' ? 1 : Math.max(rule.minSessions || 1, Math.ceil(((rule.minPct || 0) / 100) * (actTotals.get(act) || 0)));
      if (n >= need) { direct.add(id); break; }
    }
  }
  return { direct, all: people };
}

// ---- مؤشرات المخرجات الشهرية (M / FM / CWD M / CWD FM) ----
export function outputMonthly(project, db) {
  const cx = context(db), res = [];
  for (const ind of project.outputIndicators || []) {
    const months = Array.from({ length: 12 }, () => emptyCats());
    const seen = Array.from({ length: 12 }, () => new Set());
    let unknownUnique = 0;
    const acts = new Set(ind.activityIds);
    for (const s of db.sessions) {
      if (s.projectId !== project.id || !acts.has(s.activityId)) continue;
      const m = monthIdx(project, s.date); if (m < 0 || m > 11) continue;
      if (s.mode === 'roll') {
        for (const id of new Set(s.attendance || [])) {
          const b = cx.bnf.get(id); if (!b) continue;
          if (ind.measure === 'sessions-attendance') months[m][catOf(b.sex, b.disability)]++;
          else if (!seen[m].has(id)) { seen[m].add(id); months[m][catOf(b.sex, b.disability)]++; }
        }
      } else { const c = sessionCats(s, cx); for (const k of CATS) months[m][k] += c[k]; unknownUnique++; }
    }
    res.push({ ind, months, countsModeSessions: unknownUnique });
  }
  return res;
}

// ---- تفصيل المستفيدين حسب الربع/الجنس/الإعاقة/الفئة العمرية ----
// الناتج: بند (intervention) × ربع × فئة (M,F,CWD_M,CWD_F) × [7 فئات عمرية]
// جلسة بالأعداد بلا توزيع عمري: إن وقع عمر النشاط كله ضمن فئة عمرية واحدة نضع الأعداد فيها
export function inferBands(a, c) {
  if (a.ageMin == null || a.ageMax == null) return null;
  const lo = bandOf(a.ageMin), hi = bandOf(a.ageMax); if (!lo || lo !== hi) return null;
  const f = (n) => Object.assign(Array(7).fill(0), { [lo.col]: n || 0 });
  return { M: f(c.M), F: f(c.F), MWD: f(c.MWD), FWD: f(c.FWD) };
}
export function breakdown(project, db) {
  const cx = context(db), out = {};
  const get = (q, iv, cat) => (out[`${q}|${iv}|${cat}`] ||= Array(7).fill(0));
  const seen = new Set(); let noAge = 0;
  for (const s of db.sessions) {
    if (s.projectId !== project.id) continue;
    const a = cx.act.get(s.activityId); if (!a) continue;
    const m = monthIdx(project, s.date); if (m < 0 || m > 11) continue;
    const q = quarterOf(m);
    if (s.mode === 'roll') {
      for (const id of new Set(s.attendance || [])) {
        const b = cx.bnf.get(id); if (!b) continue;
        const k = `${q}|${a.interventionId}|${id}`; if (seen.has(k)) continue; seen.add(k);
        const band = bandOf(ageAt(b, s.date)); if (!band) { noAge++; continue; }
        get(q, a.interventionId, catOf(b.sex, b.disability))[band.col]++;
      }
    } else {
      const c = s.counts || {}, bands = s.bandCounts || inferBands(a, c); // bandCounts اختياري: {M:[7],F:[7],MWD:[7],FWD:[7]}
      if (!bands) { noAge += (c.M || 0) + (c.F || 0) + (c.MWD || 0) + (c.FWD || 0); continue; }
      for (const [key, cat] of [['M', 'M'], ['F', 'F'], ['MWD', 'CWD_M'], ['FWD', 'CWD_F']]) (bands[key] || []).forEach((n, i) => { get(q, a.interventionId, cat)[i] += n; });
    }
  }
  return { cells: out, unclassified: noAge };
}

// ---- خطة العمل: أسابيع الشهر (فعلي) لكل نشاط ----
export function workplanActual(project, db) {
  const res = new Map();
  for (const s of db.sessions) {
    if (s.projectId !== project.id) continue;
    const m = monthIdx(project, s.date); if (m < 0 || m > 11) continue;
    const arr = res.get(s.activityId) || Array(48).fill(0);
    arr[m * 4 + weekOfMonth(s.date) - 1] += s.units || 1; res.set(s.activityId, arr);
  }
  return res;
}

// ---- لوحة القيادة ----
export function dashboard(project, db) {
  const cx = context(db), ss = db.sessions.filter((s) => s.projectId === project.id);
  const tot = emptyCats(), byAct = {}, byMonth = Array.from({ length: 12 }, () => ({ sessions: 0, att: 0 })), byCenter = {}, byBand = Array(7).fill(0), byGroup = {};
  const planned = {}; for (const a of project.activities) planned[a.id] = a.plannedSessions || 0;
  for (const s of ss) {
    const c = sessionCats(s, cx), t = sumCats(c), a = cx.act.get(s.activityId);
    for (const k of CATS) tot[k] += c[k];
    const r = (byAct[a?.name || '؟'] ||= { sessions: 0, att: 0, planned: planned[s.activityId] || 0, id: s.activityId }); r.sessions += s.units || 1; r.att += t;
    const mi = monthIdx(project, s.date); if (mi >= 0 && mi < 12) { byMonth[mi].sessions += s.units || 1; byMonth[mi].att += t; }
    const cn = cx.ctr.get(s.centerId)?.name || '؟'; (byCenter[cn] ||= { sessions: 0, att: 0 }); byCenter[cn].sessions += s.units || 1; byCenter[cn].att += t;
    const g = a?.group || '؟'; byGroup[g] = (byGroup[g] || 0) + t;
  }
  const bd = breakdown(project, db);
  for (const [k, arr] of Object.entries(bd.cells)) arr.forEach((n, i) => (byBand[i] += n));
  const byBandCounts = Array(7).fill(0);
  for (const s of ss) { if (s.mode !== 'counts') continue; const a = cx.act.get(s.activityId), m = monthIdx(project, s.date); if (!a || m < 0 || m > 11) continue;
    const bands = s.bandCounts || inferBands(a, s.counts || {}); if (!bands) continue; for (const arr of Object.values(bands)) arr.forEach((n, i) => (byBandCounts[i] += n)); }
  const d = directBeneficiaries(project, db);
  return { byBandCounts, project, sessions: ss.length, attendance: sumCats(tot), cats: tot, byAct, byMonth, byCenter, byBand, byGroup, directCount: d.direct.size, uniqueRolled: d.all.size, unclassified: bd.unclassified };
}
