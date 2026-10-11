// الإعدادات: متغيرات قابلة للضبط، تسميات القوائم المدمجة، قوائم مخصصة (متوافقة مع choices في XLSForm/KoBo)، وحزمة تصدير/استيراد.
// المفاتيح الداخلية (M/F، child/youth…) ثابتة لأن قالب Annex 5 يعتمد عليها؛ المسموح تغيير التسميات (عربي/English) لا المفاتيح.
import { GROUPS, SEX, SESSION_MODES } from './model.js';

export const VARS = [
  { key: 'nameMinWords', ar: 'أقل عدد كلمات للاسم (كشوف الحضور)', def: 3, min: 1, max: 5, step: 1, help: 'الاسم الأقل من هذا العدد يُرفض في الكشف (مثال: ثلاثي = 3).' },
  { key: 'maxSessionHours', ar: 'أقصى مدة جلسة قبل التحذير (ساعات)', def: 10, min: 1, max: 24, step: 1, help: 'تظهر تحذيرًا إذا تجاوزت مدة الجلسة هذا الحد.' },
  { key: 'dayStartHour', ar: 'بداية الدوام المعتاد (ساعة)', def: 6, min: 0, max: 23, step: 1, help: 'جلسة تبدأ قبل هذه الساعة تُحذَّر كخارج الدوام.' },
  { key: 'lastStartHour', ar: 'آخر ساعة بدء معتادة', def: 20, min: 0, max: 23, step: 1, help: 'جلسة تبدأ بعد هذه الساعة تُحذَّر.' },
  { key: 'dayEndHour', ar: 'نهاية الدوام المعتاد (ساعة)', def: 21, min: 0, max: 24, step: 1, help: 'جلسة تنتهي بعد هذه الساعة تُحذَّر.' },
];
export const DEF_DTYPES = ['سمعية', 'بصرية', 'حركية', 'ذهنية', 'أخرى'];
const ORIG = { groups: { ...GROUPS }, sex: { ...SEX }, modes: { ...SESSION_MODES } };
export const GROUP_EN_DEF = { community: 'Community (elders / history bearers)', child: 'Children', youth: 'Youth', parent: 'Parents', localEducator: 'Local Educator', nawaEducator: 'NAWA educators' };

export const cfg = { vars: {}, groupEn: {}, dtypes: null, lists: [] };
export const V = (k) => { const d = VARS.find((x) => x.key === k); const v = Number(cfg.vars[k]); return Number.isFinite(v) && cfg.vars[k] !== '' && cfg.vars[k] != null ? v : d?.def; };
export const hasVar = (k) => cfg.vars[k] != null && cfg.vars[k] !== '' && V(k) !== VARS.find((x) => x.key === k)?.def;
export const groupEn = (k) => cfg.groupEn[k] || GROUP_EN_DEF[k] || k;

// تُطبَّق التسميات على كائنات النموذج في مكانها كي يراها كل البرنامج دون تعديل مواضع الاستعمال
export function applyConfig(dtypesRef) {
  Object.assign(GROUPS, ORIG.groups, cfg.groupAr || {}); Object.assign(SEX, ORIG.sex, cfg.sexAr || {}); Object.assign(SESSION_MODES, ORIG.modes, cfg.modesAr || {});
  if (dtypesRef) { dtypesRef.length = 0; dtypesRef.push(...(cfg.dtypes?.length ? cfg.dtypes : DEF_DTYPES)); }
}
export function loadConfig(v, dtypesRef) {
  Object.assign(cfg, { vars: {}, groupEn: {}, groupAr: {}, sexAr: {}, modesAr: {}, dtypes: null, lists: [] }, v || {}); applyConfig(dtypesRef);
}
export const configJSON = () => JSON.parse(JSON.stringify(cfg));
export const GROUP_KEYS = () => Object.keys(ORIG.groups);
export const origLabels = () => ORIG;

// ---------- القوائم المخصصة ----------
export const listById = (id) => cfg.lists.find((l) => l.id === id);
export const listChoices = (l) => (l.items || []).map((i) => `${i.ar}|${i.en || i.ar}`);
// صفوف choices (list_name, name, label::ar, label::en) كما في XLSForm
export const listsToRows = () => cfg.lists.flatMap((l) => l.items.map((i) => [l.name, i.v, i.ar, i.en || '']));
export function rowsToLists(rows, mode = 'merge') {
  let add = 0, upd = 0;
  for (const [ln, v, ar, en] of rows) {
    const name = String(ln || '').trim(), val = String(v ?? '').trim(); if (!name || !val) continue;
    let l = cfg.lists.find((x) => x.name === name); if (!l) { l = { id: 'l_' + Math.random().toString(36).slice(2, 8), name, ar: name, items: [] }; cfg.lists.push(l); }
    const it = l.items.find((x) => x.v === val); if (it) { it.ar = String(ar ?? '').trim() || it.ar; it.en = String(en ?? '').trim(); upd++; } else { l.items.push({ v: val, ar: String(ar ?? '').trim() || val, en: String(en ?? '').trim() }); add++; }
  }
  return { add, upd };
}
export const slug = (s) => String(s || '').trim().replace(/\s+/g, '_').replace(/[^\w؀-ۿ-]/g, '').slice(0, 40);
