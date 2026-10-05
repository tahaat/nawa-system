import { catOf, emptyCats, CATS, monthIdx, quarterOf, uid } from './model.js';

const last = (h) => String(h).split('/').pop().trim();
const num = (v) => (v === '' || v == null || isNaN(+v) ? v : +v);
const toIso = (v) => { if (!v) return null; if (v instanceof Date) return v.toISOString().slice(0, 10); const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v)); return m ? m[0] : null; };

// rows: مصفوفة كائنات (مفاتيحها أسماء أعمدة تصدير KoBo، بأي بادئة مجموعات)
export function importResponses(db, rows, formId) {
  const have = new Set(db.surveyResponses.map((r) => r.uuid).filter(Boolean)), res = { added: 0, dup: 0, noId: 0 };
  for (const raw of rows) {
    const a = {}; for (const [k, v] of Object.entries(raw)) a[last(k)] = num(v);
    const uuid = a._uuid || a._id || null; if (uuid && have.has(String(uuid))) { res.dup++; continue; }
    const bnfId = String(a.bnf_id ?? '').trim(); if (!bnfId) { res.noId++; continue; }
    const date = toIso(a.visit_date) || toIso(a._submission_time) || toIso(a.start) || toIso(a.end);
    db.surveyResponses.push({ id: uid('r'), uuid: uuid ? String(uuid) : null, formId: formId || a.form_ref || 'form', projectId: a.project_id || null, bnfId, round: a.round || 'endline', date, score: typeof a.score_total === 'number' ? a.score_total : null, max: typeof a.score_max === 'number' ? a.score_max : null, answers: a });
    if (uuid) have.add(String(uuid)); res.added++;
  }
  return res;
}

const passes = (r, ind) => {
  const v = ind.field && ind.field !== 'score_total' ? Number(r.answers[ind.field]) : r.score;
  if (v == null || isNaN(v)) return null;
  const thr = ind.valuePct != null && r.max ? (ind.valuePct / 100) * r.max : ind.value;
  return ({ '>=': v >= thr, '>': v > thr, '<=': v <= thr, '<': v < thr, '=': v === thr })[ind.op || '>='];
};

// يحسب البسط والمقام لكل ربع (1..4) وفئة (M, F, CWD_M, CWD_F)
export function computeOutcomes(project, db) {
  const bnf = new Map(db.beneficiaries.map((b) => [b.id, b])), out = [];
  for (const ind of project.outcomeIndicators || []) {
    const q = Array.from({ length: 4 }, () => ({ N: emptyCats(), D: emptyCats() })), issues = [];
    const rs = db.surveyResponses.filter((r) => r.formId === ind.formId && (!r.projectId || r.projectId === project.id));
    const put = (r, ok) => {
      const b = bnf.get(r.bnfId); if (!b) { issues.push(`رمز غير موجود في السجل: ${r.bnfId}`); return; }
      const m = r.date ? monthIdx(project, r.date) : -1; if (m < 0 || m > 11) { issues.push(`ردّ خارج مدة القالب: ${r.bnfId} (${r.date})`); return; }
      const c = catOf(b.sex, b.disability), k = q[quarterOf(m) - 1]; k.D[c]++; if (ok) k.N[c]++;
    };
    if (ind.kind === 'improvement') {
      const by = new Map(); for (const r of rs) { const k = r.bnfId; (by.get(k) || by.set(k, {}).get(k))[r.round] = r; }
      for (const [, p] of by) { const a = p.baseline, z = p[ind.round || 'endline']; if (!a || !z || a.score == null || z.score == null) continue; put(z, z.score - a.score >= (ind.minGain ?? 1)); }
    } else {
      const seen = new Set();
      for (const r of rs.filter((x) => x.round === (ind.round || 'endline'))) { const ok = passes(r, ind); if (ok === null) { issues.push(`ردّ بلا قيمة للحقل: ${r.bnfId}`); continue; } const k = r.bnfId; if (seen.has(k)) { issues.push(`ردّ مكرر لنفس المستفيد والمرحلة: ${k}`); continue; } seen.add(k); put(r, ok); }
    }
    out.push({ ind, quarters: q, issues });
  }
  return out;
}
// صيغة exportPTT: [{row,q,N,D}]
export const outcomesForPTT = (project, db) => computeOutcomes(project, db).flatMap((o) => (o.ind.row ? o.quarters.map((x, i) => ({ row: o.ind.row, q: i + 1, N: x.N, D: x.D })) : []));
