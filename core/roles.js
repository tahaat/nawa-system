// أدوار الجهاز (وضع مجلد OneDrive): تسهيل في الواجهة وليس حماية؛ الحماية الفعلية هي مشاركة المجلدات.
// الأدوار العليا تُقفل برمز لكل دور (PBKDF2 مملّح)، ويُحفظ المُتحقِّق في core/roles.pin فيصل كل الأجهزة.
export const PIN_MIN = 6;
export const DEV_ROLES = {
  admin: { ar: 'مدير النظام (IT)', pin: true, routes: '*' },
  meal: { ar: 'المتابعة والتقييم', pin: true, routes: '*' },
  projects: { ar: 'مسؤول مشاريع', pin: true, routes: ['dash', 'projects', 'plan', 'bnf', 'ops', 'sessions', 'sheets', 'check', 'export', 'cloud', 'gloss'] },
  entry: { ar: 'مدخل بيانات (المكتب)', routes: ['bnf', 'sheets', 'sessions', 'ops', 'surveys', 'check', 'cloud', 'gloss'] },
  coordinator: { ar: 'منسق مركز', center: true, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'surveys', 'check', 'cloud', 'gloss'] },
  facilitator: { ar: 'منشط / تربوي', center: true, routes: ['sheets', 'sessions', 'surveys', 'cloud'] },
};
export const PIN_ROLES = Object.keys(DEV_ROLES).filter((k) => DEV_ROLES[k].pin);
export const needsPin = (r) => !!DEV_ROLES[r]?.pin;
// الكائن الذي تقرؤه الواجهة عبر me(): الدور والشاشات المسموحة ومركز المنسق
export function roleMe(role, center = '') {
  const d = DEV_ROLES[role]; if (!d) return null;
  return { name: '', role, centers: center ? [center] : [], policy: { routes: d.routes, manageUsers: false, write: { sessions: d.center ? 'own' : 'all' } } };
}
const enc = new TextEncoder();
const b64 = (u) => btoa(String.fromCharCode(...u));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pin, salt, it) {
  const k = await crypto.subtle.importKey('raw', enc.encode(String(pin).trim()), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, k, 256));
}
export async function makeVerifier(pin, it = 150000) {
  if (String(pin).trim().length < PIN_MIN) throw new Error(`الرمز ${PIN_MIN} خانات على الأقل`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), it, hash: b64(await derive(pin, salt, it)) };
}
export async function checkPin(pin, v) { if (!v?.salt || !v.hash) return false; return b64(await derive(pin, unb64(v.salt), v.it || 150000)) === v.hash; }
export const fpOf = (v) => (v?.hash ? v.hash.slice(0, 10) : '');
