// منطق الصلاحيات المشترك بين خادم Node وWorker (دوال نقية، بلا اعتماد على قاعدة بيانات)
export const COLLS = ['projects', 'centers', 'beneficiaries', 'sessions', 'enrollments', 'surveyResponses', 'sheets', 'ops'];
export const today = () => new Date().toISOString().slice(0, 10);
export const activeAssign = (u) => { let a = []; try { a = JSON.parse(u.assignments || '[]'); } catch { /* */ } const t = today(); return a.filter((x) => (!x.from || x.from <= t) && (!x.to || x.to >= t)); };
const ALL = Object.fromEntries(COLLS.map((c) => [c, 'all']));
export const DEFAULT_POLICY = {
  admin: { read: ALL, write: ALL, hidden: {}, routes: '*', manageUsers: true },
  meal: { read: ALL, write: ALL, hidden: {}, routes: '*' },
  entry: { read: ALL, write: { sessions: 'all', sheets: 'all', ops: 'all', beneficiaries: 'all', centers: 'all', surveyResponses: 'all', enrollments: 'all' }, hidden: {}, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'centers', 'check', 'surveys', 'export', 'cloud'] },
  projects: { read: { projects: 'proj', centers: 'all', beneficiaries: 'enr', sessions: 'proj', sheets: 'proj', ops: 'proj', surveyResponses: 'proj', enrollments: 'proj' }, write: { projects: 'proj', sessions: 'proj', sheets: 'proj', ops: 'proj', enrollments: 'proj' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'projects', 'plan', 'check', 'surveys', 'export', 'cloud'] },
  facilitator: { read: { projects: 'proj', centers: 'all', beneficiaries: 'enr', sessions: 'proj', sheets: 'proj', surveyResponses: 'proj', enrollments: 'proj' }, write: { sessions: 'proj', sheets: 'proj', surveyResponses: 'proj', beneficiaries: 'create', enrollments: 'proj' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['sheets', 'sessions', 'surveys', 'cloud'] },
  coordinator: { read: { projects: 'all', centers: 'all', beneficiaries: 'all', sessions: 'own', sheets: 'own', ops: 'own', surveyResponses: 'own', enrollments: 'all' }, write: { sessions: 'own', sheets: 'own', ops: 'own', beneficiaries: 'all', surveyResponses: 'own', enrollments: 'all' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'check', 'surveys', 'cloud'] },
};
export const projectOf = (coll, d) => (!d ? null : coll === 'projects' ? d.id : ['sessions', 'sheets', 'ops', 'enrollments'].includes(coll) ? d.projectId ?? null : coll === 'surveyResponses' ? d.projectId ?? d.answers?.projectId ?? null : null);
export const centerOf = (coll, d) => (!d ? null : (coll === 'sessions' || coll === 'sheets' || coll === 'ops') ? d.centerId ?? null : coll === 'surveyResponses' ? d.answers?.center ?? null : null);
export const userCenters = (u) => { let c = []; try { c = JSON.parse(u.centers || '[]'); } catch { /* */ } return [...new Set([...c, ...activeAssign(u).map((a) => a.center).filter(Boolean)])]; };
export const userProjects = (u) => [...new Set(activeAssign(u).map((a) => a.project).filter(Boolean))];
// النطاق: all | own (مراكزه) | proj (مشاريعه/تكليفاته) | create (إنشاء سجلات جديدة فقط)
export const inScope = (sc, center, project, u, exists = false) => {
  if (sc === 'all') return true; if (sc === 'create') return !exists;
  if (sc === 'own') return !!center && userCenters(u).includes(center);
  if (sc === 'proj') { const as = activeAssign(u); if (!project) return false; return as.some((a) => a.project === project && (!a.center || !center || a.center === center)); }
  return false;
};
export const stripHidden = (coll, data, pol) => { const h = pol.hidden?.[coll]; if (!h || !data) return data; const d = { ...data }; for (const f of h) delete d[f]; return d; };
