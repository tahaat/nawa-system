// الانتماء للمشاريع: المستفيد يمكن أن يكون في أكثر من مشروع بنفس الوقت (علاقة متعدد-إلى-متعدد عبر enrollments).
// السجل {id, beneficiaryId, projectId, centerId?, status:'active'|'ended', start, end, direct?}. الانتهاء يُبقي السجل ولا يحذفه.
import { KINDS, peopleOf } from './sheets.js';

export const enrId = (bid, pid) => 'en_' + bid + '_' + pid;
const today = () => new Date().toISOString().slice(0, 10);

export function findEnrollment(db, bid, pid) {
  return db.enrollments.find((e) => e.beneficiaryId === bid && e.projectId === pid) || null;
}
// يضمن وجود انتماء نشط؛ يعيد true إذا تغيّر شيء (جديد أو أُعيد تفعيله)
export function ensureEnrollment(db, bid, pid, centerId, start) {
  if (!bid || !pid) return false;
  const e = findEnrollment(db, bid, pid);
  if (e) { if (e.status === 'ended') return false; if (!e.status) { e.status = 'active'; return true; } return false; }
  db.enrollments.push({ id: enrId(bid, pid), beneficiaryId: bid, projectId: pid, centerId: centerId || null, status: 'active', start: start || today(), end: '' });
  return true;
}
// إنهاء/إعادة تفعيل صريحان من المستخدم
export function endEnrollment(db, bid, pid, end) {
  const e = findEnrollment(db, bid, pid); if (!e) return false;
  e.status = 'ended'; e.end = end || today(); return true;
}
export function reactivate(db, bid, pid) {
  const e = findEnrollment(db, bid, pid); if (!e) return ensureEnrollment(db, bid, pid);
  e.status = 'active'; e.end = ''; return true;
}
export const projectsOf = (db, bid, activeOnly = true) => db.enrollments.filter((e) => e.beneficiaryId === bid && (!activeOnly || e.status !== 'ended')).map((e) => e.projectId);
export const enrolledIn = (db, pid, activeOnly = true) => new Set(db.enrollments.filter((e) => e.projectId === pid && (!activeOnly || e.status !== 'ended')).map((e) => e.beneficiaryId));

// يستنتج الانتماءات الناقصة من النشاط الفعلي (جلسات، كشوفات، ردود استبيانات). لا يعيد تفعيل المنتهي ولا يحذف شيئًا.
export function backfillEnrollments(db) {
  let n = 0; const known = new Set(db.beneficiaries.map((b) => b.id));
  const add = (bid, pid, c) => { if (known.has(bid) && pid && ensureEnrollment(db, bid, pid, c)) n++; };
  for (const s of db.sessions) for (const id of s.attendance || []) add(id, s.projectId, s.centerId);
  for (const sh of db.sheets) {
    if (!KINDS[sh.kind]) continue;
    for (const p of peopleOf(sh, db)) if (!p.guest && !p.missing) add(p.id, sh.projectId, sh.centerId);
  }
  for (const r of db.surveyResponses) add(r.bnfId, r.projectId, null);
  return n;
}
