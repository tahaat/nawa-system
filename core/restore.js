// منطق الاستعادة الانتقائية من نسخة احتياطية (مشترك بين Worker والاختبارات)
// الأوضاع: missing = يعيد المحذوف والمفقود فقط ؛ newer = ويعيد أيضًا ما نسخته أحدث من الموجود.
export const MODES = ['missing', 'newer'];
export function pick(records, { colls, project, since, ids } = {}) {
  const cs = colls?.length ? new Set(colls) : null, t = since ? Date.parse(since) : 0, is = Array.isArray(ids) ? new Set(ids) : null;
  return (records || []).filter((r) => r && r.coll && r.id && !r.deleted && (!is || is.has(r.coll + '|' + r.id)) && (!cs || cs.has(r.coll)) && (!project || r.project === project) && (!t || (r.ts || 0) >= t));
}
export const kindOf = (r, ex, mode) => (!ex ? 'missing' : ex.deleted ? 'revive' : mode === 'newer' && (ex.ts || 0) < (r.ts || 0) ? 'newer' : null);
// have: Map بمفتاح coll|id → الصف الحالي
export function plan(records, have, opts = {}) {
  const mode = MODES.includes(opts.mode) ? opts.mode : 'missing', acts = [], counts = {};
  for (const r of pick(records, opts)) {
    const c = (counts[r.coll] ||= { missing: 0, revive: 0, newer: 0, skip: 0 }), k = kindOf(r, have.get(r.coll + '|' + r.id), mode);
    if (k) { c[k]++; acts.push({ r, kind: k }); } else c.skip++;
  }
  return { acts, counts, total: acts.length };
}

// وصف مقروء للسجل (اسم/تاريخ/مركز…) يُبنى من محتوى النسخة نفسها
const J = (d) => { try { return typeof d === 'string' ? JSON.parse(d) : d || {}; } catch { return {}; } };
export function labeler(records) {
  const M = { projects: new Map(), centers: new Map(), beneficiaries: new Map() };
  for (const r of records || []) if (M[r.coll]) M[r.coll].set(r.id, J(r.data));
  const nm = (c, id) => { const o = M[c].get(id); return o?.name || o?.title || o?.code || id || ''; };
  const act = (pid, aid) => (M.projects.get(pid)?.activities || []).find((a) => a.id === aid)?.name || aid || '';
  return (r) => {
    const o = J(r.data), j = (a) => a.filter(Boolean).join(' — ');
    switch (r.coll) {
      case 'beneficiaries': return j([o.name, o.code && '(' + o.code + ')', o.sex === 'F' ? 'أنثى' : o.sex === 'M' ? 'ذكر' : '', o.dob || o.birth]);
      case 'sessions': return j([act(o.projectId, o.activityId) || o.title, o.date, nm('centers', o.centerId), o.educator && 'المدرّب: ' + o.educator, Array.isArray(o.attendance) && o.attendance.length + ' حاضر', nm('projects', o.projectId)]);
      case 'enrollments': return j([nm('beneficiaries', o.beneficiaryId), nm('projects', o.projectId), nm('centers', o.centerId), o.start]);
      case 'surveyResponses': return j([o.formId, o.round, o.date, o.bnfId && nm('beneficiaries', o.bnfId), o.score != null && 'الدرجة ' + o.score]);
      case 'sheets': return j([o.title || o.name || o.kind, o.date || o.month, nm('centers', o.centerId), nm('projects', o.projectId)]);
      case 'ops': return j([act(o.projectId, o.activityId), o.date, nm('centers', o.centerId), o.ref, o.qty != null && 'الكمية ' + o.qty]);
      case 'projects': return j([o.name, o.donor, o.code]);
      case 'centers': return j([o.name, o.code]);
      default: return o.name || o.title || r.id;
    }
  } ;
}
