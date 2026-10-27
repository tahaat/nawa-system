// منطق الاستعادة الانتقائية من نسخة احتياطية (مشترك بين Worker والاختبارات)
// الأوضاع: missing = يعيد المحذوف والمفقود فقط ؛ newer = ويعيد أيضًا ما نسخته أحدث من الموجود.
export const MODES = ['missing', 'newer'];
export function pick(records, { colls, project, since } = {}) {
  const cs = colls?.length ? new Set(colls) : null, t = since ? Date.parse(since) : 0;
  return (records || []).filter((r) => r && r.coll && r.id && !r.deleted && (!cs || cs.has(r.coll)) && (!project || r.project === project) && (!t || (r.ts || 0) >= t));
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
