// نموذج البيانات المشترك بين الأدوات الثلاث (PTT / STT / BTT)
export const AGE_BANDS = [
  { key: '4-6', min: 4, max: 6, col: 0 }, { key: '7-10', min: 7, max: 10, col: 1 },
  { key: '11-15', min: 11, max: 15, col: 2 }, { key: '16-18', min: 16, max: 18, col: 3 },
  { key: '19-25', min: 19, max: 25, col: 4 }, { key: '26-40', min: 26, max: 40, col: 5 },
  { key: '41+', min: 41, max: 200, col: 6 },
];
export const GROUPS = { child: 'أطفال', youth: 'شباب', parent: 'أهالي', localEducator: 'منشطون محليون', nawaEducator: 'منشطو نوى' };
export const SESSION_MODES = { roll: 'كشف أسماء', counts: 'أعداد فقط' };
export const SEX = { M: 'ذكر', F: 'أنثى' };

let _n = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(++_n).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const parseDate = (d) => (d instanceof Date ? d : new Date(`${d}T00:00:00Z`));
export const iso = (d) => parseDate(d).toISOString().slice(0, 10);

export function ageAt(b, date) {
  if (b.age != null && !b.dob) return Number(b.age);
  if (!b.dob) return null;
  const d = parseDate(date), o = parseDate(b.dob);
  let a = d.getUTCFullYear() - o.getUTCFullYear();
  if (d.getUTCMonth() < o.getUTCMonth() || (d.getUTCMonth() === o.getUTCMonth() && d.getUTCDate() < o.getUTCDate())) a--;
  return a;
}
export const bandOf = (age) => (age == null ? null : AGE_BANDS.find((b) => age >= b.min && age <= b.max) || null);

// شهر المشروع (0..11) بالنسبة لتاريخ بدايته؛ سالب أو >=12 يعني خارج السنة الأولى من القالب
export function monthIdx(project, date) {
  const s = parseDate(project.start), d = parseDate(date);
  return (d.getUTCFullYear() - s.getUTCFullYear()) * 12 + d.getUTCMonth() - s.getUTCMonth();
}
export const quarterOf = (m) => Math.floor(m / 3) + 1;
export const weekOfMonth = (date) => Math.min(4, Math.ceil(parseDate(date).getUTCDate() / 7));

export const catOf = (sex, disabled) => (disabled ? (sex === 'M' ? 'CWD_M' : 'CWD_F') : sex === 'M' ? 'M' : 'F');
export const CATS = ['M', 'F', 'CWD_M', 'CWD_F'];
export const emptyCats = () => ({ M: 0, F: 0, CWD_M: 0, CWD_F: 0 });

export function newDb() {
  return { projects: [], centers: [], beneficiaries: [], sessions: [], enrollments: [], surveyResponses: [] };
}
