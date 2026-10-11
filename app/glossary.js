// ذاكرة الترجمة: ترجمات المستخدم المخزّنة (تتقدّم على القاموس المدمج) + ترجمة النصوص الناقصة عبر الإنترنت وحفظها لتعمل بعدها بلا اتصال.
// الخصوصية: لا يُرسَل أبدًا إلى الإنترنت أي نص يحوي اسم مستفيد أو مستخدم أو رقم هاتف؛ والإرسال اختياري (يدوي أو تلقائي بإذن صريح).
import ExcelJS from 'exceljs';
import { kvGet, kvSet, db, sync } from './store.js';
import { setUserPairs, setMissingHooks, getMissing, refresh, getLang, builtinPairs, tr } from './i18n.js';

export const PROVIDERS = {
  google: { name: 'Google Translate', url: (q) => `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(q)}`, pick: (j) => (j?.[0] || []).map((x) => x[0]).join('') },
  mymemory: { name: 'MyMemory', url: (q) => `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=ar|en`, pick: (j) => (j?.responseStatus === 200 && !/MYMEMORY WARNING/i.test(j.responseData?.translatedText || '') ? j.responseData.translatedText : '') },
};
export const gl = { entries: [], auto: false, provider: 'google', busy: false, last: '' }; // entries: {ar, en, src: 'user'|'online'}
const apply = () => setUserPairs(gl.entries.filter((e) => e.en).map((e) => [e.ar, e.en]));
const persist = () => kvSet('glossary', { entries: gl.entries, auto: gl.auto, provider: gl.provider });

export async function loadGlossary() {
  const v = await kvGet('glossary'); if (v) { gl.entries = v.entries || []; gl.auto = !!v.auto; gl.provider = PROVIDERS[v.provider] ? v.provider : 'google'; }
  apply();
  // لا نرسل أسماء المستفيدين/المستخدمين إلى أي خدمة خارجية
  setMissingHooks({ pii: (t) => piiHit(t), onMiss: scheduleAuto });
}
function piiHit(t) {
  if (/\d{7,}/.test(t.replace(/[\s-]/g, ''))) return true;
  for (const b of db.beneficiaries) { const n = (b.name || '').trim(); if (n.length >= 3 && t.includes(n)) return true; }
  for (const u of sync.cfg?.me ? [sync.cfg.me] : []) if (u.name && t.includes(u.name)) return true;
  return false;
}
export function setEntry(ar, en, src = 'user') {
  ar = ar.trim(); en = en.trim(); if (!ar) return;
  const i = gl.entries.findIndex((e) => e.ar === ar);
  if (!en) { if (i >= 0) gl.entries.splice(i, 1); } else if (i >= 0) { gl.entries[i].en = en; gl.entries[i].src = src; } else gl.entries.push({ ar, en, src });
  apply(); persist(); refresh();
}
export const delEntry = (ar) => setEntry(ar, '');
export function setOptions(o) { Object.assign(gl, o); persist(); if (o.auto) scheduleAuto(); }
export const missingList = () => getMissing().filter((x) => !piiHit(x));
export const stats = () => ({ builtin: builtinPairs().size, user: gl.entries.filter((e) => e.src === 'user').length, online: gl.entries.filter((e) => e.src === 'online').length, missing: missingList().length });

async function one(q, prov) {
  const r = await fetch(PROVIDERS[prov].url(q)); if (!r.ok) throw new Error('HTTP ' + r.status);
  return String(PROVIDERS[prov].pick(await r.json()) || '').trim();
}
// يترجم القائمة (بتوازٍ 3) ويحفظ الناجح؛ عند فشل المزوّد الأول يجرّب الآخر. يعيد {ok, fail}
export async function translateOnline(list = missingList()) {
  if (gl.busy || !list.length) return { ok: 0, fail: 0 }; if (!navigator.onLine) return { ok: 0, fail: list.length, offline: true };
  gl.busy = true; let ok = 0, fail = 0; const queue = [...list], order = [gl.provider, ...Object.keys(PROVIDERS).filter((k) => k !== gl.provider)];
  const worker = async () => { for (let q; (q = queue.shift());) { let en = ''; for (const p of order) { try { en = await one(q, p); if (en) break; } catch { /* جرّب الآخر */ } } if (en && en !== q) { const i = gl.entries.findIndex((e) => e.ar === q); if (i < 0) gl.entries.push({ ar: q, en, src: 'online' }); ok++; } else fail++; } };
  try { await Promise.all([worker(), worker(), worker()]); } finally { gl.busy = false; }
  apply(); persist(); refresh(); gl.last = new Date().toISOString(); return { ok, fail };
}
let at; export function scheduleAuto() { if (!gl.auto || getLang() !== 'en') return; clearTimeout(at); at = setTimeout(async () => { if (!gl.auto || getLang() !== 'en' || !navigator.onLine) return; const r = await translateOnline(); if (r.ok) window.dispatchEvent(new CustomEvent('nawa:gloss')); }, 1500); }
window.addEventListener('online', () => scheduleAuto());

// ---------- تصدير/استيراد ----------
export const glossJSON = () => JSON.stringify({ app: 'nawa-glossary', v: 1, at: new Date().toISOString(), pairs: gl.entries }, null, 1);
export async function glossXLSX(all = false) {
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('الترجمة', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [{ header: 'العربية', key: 'ar', width: 50 }, { header: 'English', key: 'en', width: 50 }, { header: 'المصدر', key: 'src', width: 14 }];
  const rows = all ? [...builtinPairs()].map(([ar, en]) => ({ ar, en, src: 'builtin' })) : []; const have = new Set(gl.entries.map((e) => e.ar));
  ws.addRows([...gl.entries, ...rows.filter((r) => !have.has(r.ar))]);
  ws.eachRow((r, i) => r.eachCell((c) => { c.font = { name: 'Sakkal Majalla', size: 13, bold: i === 1, color: i === 1 ? { argb: 'FFFFFFFF' } : undefined }; if (i === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA21008' } }; }));
  return wb.xlsx.writeBuffer();
}
function parseCSV(t) { const rows = []; let r = [], c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',' || ch === '\t') { r.push(c); c = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; } else c += ch; } if (c || r.length) { r.push(c); rows.push(r); } return rows; }
export async function importGlossary(file) {
  let pairs = [];
  if (/\.xlsx$/i.test(file.name)) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); wb.worksheets[0].eachRow((r, i) => { const v = (k) => { const x = r.getCell(k).value; return String(x?.result ?? x?.text ?? x ?? '').trim(); }; if (i > 1 || !/^(العربية|arabic)$/i.test(v(1))) pairs.push({ ar: v(1), en: v(2) }); }); }
  else if (/\.json$/i.test(file.name)) { const j = JSON.parse(await file.text()); pairs = Array.isArray(j) ? j : j.pairs || Object.entries(j).map(([ar, en]) => ({ ar, en })); }
  else pairs = parseCSV(await file.text()).map((r) => ({ ar: (r[0] || '').trim(), en: (r[1] || '').trim() }));
  return mergePairs(pairs);
}
export function mergePairs(pairs) {
  let add = 0, upd = 0; for (const p of pairs) { if (!p.ar || !p.en || !/[؀-ۿ]/.test(p.ar) || /^(arabic|العربية)$/i.test(p.ar)) continue; const i = gl.entries.findIndex((e) => e.ar === p.ar.trim()); if (i >= 0) { gl.entries[i].en = p.en.trim(); gl.entries[i].src = 'user'; upd++; } else { gl.entries.push({ ar: p.ar.trim(), en: p.en.trim(), src: 'user' }); add++; } }
  apply(); persist(); refresh(); return { add, upd };
}
export const lookup = (ar) => tr(ar);
