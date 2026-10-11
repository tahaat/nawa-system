// تحقق حقول المستفيد (نقي بلا واجهة): الاسم، الهاتف، الهوية، البريد، وأنواع المرفقات
import { V } from './settings.js';
const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
export const toLatin = (s) => String(s ?? '').replace(/[٠-٩]/g, (d) => AR.indexOf(d)).replace(/[۰-۹]/g, (d) => FA.indexOf(d));
export const digits = (s) => toLatin(s).replace(/[\s\-().]/g, '');
// 00970/+970 → 0
export const normPhone = (s) => { let d = digits(s); d = d.replace(/^(\+|00)?970/, '0'); if (/^5[69]\d{7}$/.test(d)) d = '0' + d; return d; };
export const PHONE_HINT = '10 أرقام تبدأ بـ 059 أو 056';
export const words = (n) => String(n || '').trim().split(/\s+/).filter(Boolean).length;
export const nameNeed = () => V('bnfNameWords');
// الحالة: empty | bad | ok  (+ رسالة مناسبة)
export function nameState(n) { const w = words(n), need = nameNeed(); if (!w) return { s: 'empty' }; return w >= need ? { s: 'ok', msg: 'الاسم مكتمل' } : { s: 'bad', msg: `الاسم منقوص: ${w} من ${need} مقاطع` }; }
export const phoneOkStrict = (p) => /^05[69]\d{7}$/.test(normPhone(p));
export function phoneState(p) { if (!String(p ?? '').trim()) return { s: 'empty' }; return phoneOkStrict(p) ? { s: 'ok', msg: 'رقم صحيح' } : { s: 'bad', msg: `رقم غير صحيح (${PHONE_HINT})` }; }
// رقم الهوية الفلسطيني: 9 أرقام، ورقم تحقق على خوارزمية لُون (يُنبَّه عند عدم المطابقة دون رفض)
export function idChecksum(d) { if (!/^\d{9}$/.test(d)) return false; let t = 0; for (let i = 0; i < 9; i++) { let x = +d[i] * (i % 2 ? 2 : 1); if (x > 9) x -= 9; t += x; } return t % 10 === 0; }
export function idState(v) { const d = digits(v); if (!d) return { s: 'empty' }; if (!/^\d{9}$/.test(d)) return { s: 'bad', msg: 'رقم الهوية 9 أرقام' }; return idChecksum(d) ? { s: 'ok', msg: 'رقم صحيح' } : { s: 'warn', msg: 'تحقق من رقم الهوية (رقم التحقق لا يطابق)' }; }
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
export function emailState(v) { if (!String(v ?? '').trim()) return { s: 'empty' }; return emailOk(v) ? { s: 'ok', msg: 'بريد صحيح' } : { s: 'bad', msg: 'بريد غير صحيح (مثال: example@gmail.com)' }; }
export const ATT_TYPES = [['id', 'صورة/وثيقة هوية'], ['cert', 'شهادة'], ['medical', 'تقرير طبي'], ['consent', 'موافقة ولي أمر'], ['photo', 'صورة شخصية'], ['other', 'أخرى']];
export const ATT_MAX = 5 * 1024 * 1024; // 5MB للملف الواحد (الصور تُضغط قبل الحفظ)
export const urlOk = (u) => { try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol); } catch { return false; } };
