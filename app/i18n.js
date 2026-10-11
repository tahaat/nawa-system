// طبقة اللغة: واجهة عربية/إنجليزية. المصدر العربي هو الأصل؛ الإنجليزية تُطبَّق بقاموس عبارات على عُقد النص والسمات.
// ما يُصدَّر من ملفات (Excel/XLSForm) لا يمر من هنا أبداً.
import RAW from './lang-en.txt?raw';
const PAIRS = RAW.split('\n').map((l) => l.split(' | ')).filter((p) => p.length >= 2).map(([a, ...b]) => [a.trim(), b.join(' | ').trim()]);
const BUILTIN = new Map(PAIRS);
let EXACT = new Map(PAIRS), user = new Map();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// العبارات متعددة الكلمات تُستبدل داخل النص؛ الكلمات المفردة بالمطابقة الكاملة فقط كي لا تُشوَّه بيانات المستخدم
let RX;
function rebuild() { EXACT = new Map([...BUILTIN, ...user]); const multi = [...EXACT].filter(([a]) => /\s/.test(a)).sort((x, y) => y[0].length - x[0].length); RX = new RegExp(multi.map(([a]) => esc(a)).join('|'), 'g'); }
rebuild();
// ترجمات المستخدم (المخزّنة/من الإنترنت) تتقدّم على القاموس المدمج
export function setUserPairs(m) { user = new Map(m); rebuild(); }
export const builtinPairs = () => BUILTIN;
const missing = new Set(); let pii = () => false, onMiss = null;
export const getMissing = () => [...missing].filter((x) => !EXACT.has(x));
export const clearMissing = () => missing.clear();
export function setMissingHooks(f) { if (f.pii) pii = f.pii; if ('onMiss' in f) onMiss = f.onMiss; }
function note(v) { const t = v.trim(); if (t.length < 2 || t.length > 300 || missing.has(t) || pii(t)) return; missing.add(t); onMiss?.(); }
export function refresh() { if (lang === 'en') walk(document.body); }
const AR = /[؀-ۿ]/;
let lang = 'ar'; try { lang = localStorage.getItem('nawa.lang') || 'ar'; } catch { /* خاص */ }
export const getLang = () => lang;
export function tr(s) {
  if (lang !== 'en' || typeof s !== 'string' || !AR.test(s)) return s;
  const t = s.trim(), ex = EXACT.get(t);
  let out = ex !== undefined ? s.replace(t, ex) : s.replace(RX, (m) => EXACT.get(m));
  if (out === s) { const m2 = t.match(/^([\s\S]*?)(\s*\*|\s*:|\s*\(\d+\))$/); if (m2 && EXACT.has(m2[1].trim())) out = s.replace(t, EXACT.get(m2[1].trim()) + m2[2]); }
  if (out === s) { const m = t.match(/^(\S+) (\d+)$/); if (m && EXACT.has(m[1])) out = s.replace(t, EXACT.get(m[1]) + ' ' + m[2]); }
  if (AR.test(out) && /[A-Za-z]/.test(out)) out = out.replace(/[\u0600-\u06FF]+/g, (w) => EXACT.get(w) ?? w); // نص مختلط: ترجم الكلمات المفردة المعروفة
  if (!AR.test(out)) out = out.replace(/،/g, ',').replace(/؟/g, '?').replace(/؛/g, ';');
  return out;
}
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);
function doText(n) { const v = n.data; if (n.__en === v || n.parentNode?.closest?.('[data-notr]')) return; const o = tr(v); if (o !== v) { n.__ar = v; n.__en = o; n.data = o; } if (AR.test(o)) note(v); }
function doEl(e) { for (const a of ATTRS) { const v = e.getAttribute?.(a); if (v && AR.test(v)) { const o = tr(v); if (o !== v) { e.setAttribute('data-ar-' + a, v); e.setAttribute(a, o); } } } }
export function walk(root) {
  if (lang !== 'en' || !root) return;
  if (root.nodeType === 3) { if (!SKIP.has(root.parentNode?.tagName)) doText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
  doEl(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { if (!SKIP.has(n.parentNode?.tagName)) doText(n); } else if (!SKIP.has(n.tagName)) doEl(n); }
}
let mo;
function observe() {
  if (mo) return; mo = new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n));
      else if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') doEl(m.target);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
export function applyDoc() {
  const h = document.documentElement; h.lang = lang; h.dir = lang === 'en' ? 'ltr' : 'rtl';
  if (!document.__arTitle) document.__arTitle = document.title;
  document.title = tr(document.__arTitle);
  if (lang === 'en') { walk(document.body); observe(); }
}
export function setLang(l) { lang = l; try { localStorage.setItem('nawa.lang', l); } catch { /* خاص */ } applyDoc(); }
export const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
