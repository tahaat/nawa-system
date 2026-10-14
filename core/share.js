// خطة مشاركة مجلدات OneDrive لكل شخص حسب دوره ومركزه (في وضع المزامنة بمجلد لا يوجد دخول داخل التطبيق؛ الصلاحية = مشاركة المجلد)
// core: البيانات الأساسية بلا حقول حساسة · pii: الهاتف/الهوية/نوع الإعاقة/المرفقات · c-<مركز>: جلسات وكشوفات المركز
export const SHARE_RULES = {
  admin: { core: 'edit', pii: 'edit', centers: 'all', cAcc: 'edit' },
  meal: { core: 'edit', pii: 'edit', centers: 'all', cAcc: 'edit' },
  projects: { core: 'edit', pii: null, centers: 'all', cAcc: 'view' },
  coordinator: { core: 'view', pii: null, centers: 'own', cAcc: 'edit' },
  facilitator: { core: 'view', pii: null, centers: 'own', cAcc: 'edit' },
  entry: { core: 'view', pii: 'edit', centers: 'all', cAcc: 'edit' },
};
export const ROLE_WORDS = [['admin', /مدير\s*النظام|\bit\b|تكنولوجيا/i], ['meal', /متابعة|تقييم|meal/i], ['projects', /مشاريع|مشروع/], ['entry', /مدخل|إدخال|ادخال/], ['coordinator', /منسق/], ['facilitator', /منشط|تربوي|مدرب/]];
export function roleFrom(txt) {
  const t = String(txt || '').trim(); if (!t) return '';
  if (SHARE_RULES[t]) return t;
  for (const [k, re] of ROLE_WORDS) if (re.test(t)) return k;
  return '';
}
// اسم مجلد المركز مقروء: c-<اسم المركز>؛ يُثبَّت في c.folder فلا يتغير لو تغيّر الاسم لاحقًا (المراكز القديمة بلا folder تبقى على رمزها)
export const folderOf = (c) => 'c-' + (c.folder || c.id);
const slug = (n) => String(n || '').replace(/[\\/:*?"<>|#%~&{}]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60);
export function assignFolders(centers) {
  const used = new Set(centers.filter((c) => c.folder).map((c) => c.folder)); let ch = 0;
  for (const c of centers) if (!c.folder) { let b = slug(c.name) || c.id, f = b, i = 2; while (used.has(f)) f = b + '-' + i++; c.folder = f; used.add(f); ch++; }
  return ch;
}
// تعيد [{folder, label, access, note?}] لشخص واحد
export function sharePlan(p, centers) {
  const r = SHARE_RULES[p.role]; if (!r) return [];
  const out = [{ folder: 'core', label: 'البيانات الأساسية', access: r.core }];
  if (r.pii) out.push({ folder: 'pii', label: 'حقول حساسة', access: r.pii });
  if (r.centers === 'all') for (const c of centers) out.push({ folder: folderOf(c), label: c.name, access: r.cAcc });
  else {
    const c = centers.find((x) => x.id === p.center);
    if (c) out.push({ folder: folderOf(c), label: c.name, access: r.cAcc }); else out.push({ folder: '', label: 'لم يُحدَّد مركز', access: null, note: 'حدّد المركز ليُعرف مجلده' });
  }
  return out;
}
export const ACC_AR = { edit: 'تحرير', view: 'عرض فقط' };

// مجموعات Microsoft 365 (تُنشأ مرة واحدة؛ الموظف الجديد يُضاف إليها فقط بدل مشاركة كل مجلد)
// مجموعات الأدوار: Nawa-Admin-MEAL / Nawa-Projects / Nawa-Entry / Nawa-Field · ومجموعة لكل مركز: Nawa-<اسم المجلد بلا c->
export const GRP = { adminMeal: 'Nawa-Admin-MEAL', projects: 'Nawa-Projects', entry: 'Nawa-Entry', field: 'Nawa-Field' };
export const centerGroup = (c) => 'Nawa-' + (c.folder || c.id);
export function groupsOf(p, centers) {
  const k = p.role, out = [];
  if (k === 'admin' || k === 'meal') out.push(GRP.adminMeal);
  else if (k === 'projects') out.push(GRP.projects);
  else if (k === 'entry') out.push(GRP.entry);
  else if (k === 'coordinator' || k === 'facilitator') { out.push(GRP.field); const c = centers.find((x) => x.id === p.center); if (c) out.push(centerGroup(c)); }
  return out;
}
// لكل مجموعة: أي مجلد وبأي صلاحية تُشارَك معها (مرة واحدة)
export function groupAccess(centers) {
  const all = (acc) => centers.map((c) => ({ folder: folderOf(c), access: acc }));
  return [
    { group: GRP.adminMeal, items: [{ folder: 'NawaSync (الكل)', access: 'edit' }] },
    { group: GRP.projects, items: [{ folder: 'core', access: 'edit' }, ...all('view')] },
    { group: GRP.entry, items: [{ folder: 'core', access: 'view' }, { folder: 'pii', access: 'edit' }, ...all('edit')] },
    { group: GRP.field, items: [{ folder: 'core', access: 'view' }] },
    ...centers.map((c) => ({ group: centerGroup(c), items: [{ folder: folderOf(c), access: 'edit' }] })),
  ];
}
