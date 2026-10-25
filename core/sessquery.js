// فلترة سجل الجلسات + عدد المستفيدين بلا تكرار (حسب نشاط/مركز/مشروع ضمن فترة)
import { catOf, emptyCats } from './model.js';
import { sessionCats, sumCats } from './aggregate.js';
const ci = (s) => String(s ?? '').toLowerCase();
export const emptyF = () => ({ from: '', to: '', act: '', center: '', edu: '', mode: '', src: '', grp: '', status: '', q: '' });
export const isActiveF = (f) => Object.values(f).some((v) => v !== '' && v != null);
// levelOf(s) => 'ok' | 'warn' | 'error' (يُمرَّر لأن حسابه مكلف ولا يلزم إلا عند طلب فلتر الحالة)
export function filterSessions(sessions, f, cx, levelOf) {
  const q = ci(f.q).trim(), edu = ci(f.edu).trim();
  return sessions.filter((s) => {
    if (f.from && s.date < f.from) return false; if (f.to && s.date > f.to) return false;
    if (f.act && s.activityId !== f.act) return false; if (f.center && s.centerId !== f.center) return false;
    if (edu && !ci(s.educator).includes(edu)) return false;
    if (f.mode && s.mode !== f.mode) return false;
    if (f.src === 'sheet' && !s.sheetId) return false; if (f.src === 'direct' && s.sheetId) return false;
    if (f.grp && ci(s.grp).trim() !== ci(f.grp).trim()) return false;
    if (f.status) { const lv = levelOf ? levelOf(s) : 'ok'; if (f.status === 'issue' ? lv === 'ok' : lv !== f.status) return false; }
    if (q) { const hay = ci([s.notes, s.educator, s.grp, cx.act.get(s.activityId)?.name, cx.ctr.get(s.centerId)?.name, s.date].join(' ')); if (!hay.includes(q)) return false; }
    return true;
  });
}
// ملخص قائمة جلسات: عدد الجلسات/الوحدات، مجموع الحضور، والمستفيدون الفريدون (كشوف الأسماء فقط)
export function summarize(list, cx) {
  const uniq = new Set(); let units = 0, att = 0, blind = 0;
  for (const s of list) { units += s.units || 1; att += sumCats(sessionCats(s, cx)); if (s.mode === 'counts') blind += sumCats(sessionCats(s, cx)); else for (const id of new Set(s.attendance || [])) uniq.add(id); }
  return { sessions: list.length, units, attendance: att, unique: uniq.size, blind };
}
// عدد المستفيدين بلا تكرار: يُجمَّع حسب by = act | center | project ؛ الشخص يُحسب مرة واحدة داخل كل صف ومرة واحدة في الإجمالي
// الجلسات بنمط «أعداد» لا هوية فيها فلا يمكن حذف تكرارها؛ تُعرض منفصلة (blind)
export function uniqueReach(db, cx, f, by = 'act') {
  const rows = new Map(), total = { name: 'الإجمالي (بلا تكرار عبر كل ما ظهر)', sessions: 0, units: 0, instances: 0, blind: 0, ids: new Set() };
  const keyOf = (s) => by === 'center' ? [s.centerId, cx.ctr.get(s.centerId)?.name || '؟'] : by === 'project' ? [s.projectId, cx.proj.get(s.projectId)?.name || '؟'] : [s.activityId, cx.act.get(s.activityId)?.name || '؟'];
  for (const s of db.sessions) {
    if (f.projectId && s.projectId !== f.projectId) continue; if (f.center && s.centerId !== f.center) continue; if (f.act && s.activityId !== f.act) continue;
    if (f.from && s.date < f.from) continue; if (f.to && s.date > f.to) continue;
    const [k, name] = keyOf(s); const r = rows.get(k) || { key: k, name, project: cx.proj.get(s.projectId)?.name || '', sessions: 0, units: 0, instances: 0, blind: 0, ids: new Set() };
    r.sessions++; total.sessions++; r.units += s.units || 1; total.units += s.units || 1;
    if (s.mode === 'counts') { const n = sumCats(sessionCats(s, cx)); r.blind += n; total.blind += n; }
    else for (const id of new Set(s.attendance || [])) { if (!cx.bnf.get(id)) continue; r.instances++; total.instances++; r.ids.add(id); total.ids.add(id); }
    rows.set(k, r);
  }
  const fin = (r) => { const c = emptyCats(); for (const id of r.ids) { const b = cx.bnf.get(id); c[catOf(b.sex, b.disability)]++; } return { ...r, unique: r.ids.size, cats: c, ids: undefined }; };
  return { rows: [...rows.values()].map(fin).sort((a, b) => b.unique - a.unique || a.name.localeCompare(b.name, 'ar')), total: fin(total) };
}
