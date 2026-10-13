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
export const folderOf = (c) => 'c-' + c.id;
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
