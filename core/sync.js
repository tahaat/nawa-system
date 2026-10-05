// محرك المزامنة (يعمل دون إنترنت): يكتشف التغييرات بمقارنة بصمات السجلات، فلا يتطلب تعديل أي شاشة إدخال.
export const COLLS = ['projects', 'centers', 'beneficiaries', 'sessions', 'enrollments', 'surveyResponses'];
const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
export function hash(o) { const s = stable(o); let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36) + s.length; }
export const newMeta = () => ({ cursor: null, hashes: {}, seqs: {}, ts: {} });

export function createSync({ db, meta, cfg, fetchFn = globalThis.fetch, now = () => Date.now() }) {
  const H = (c) => (meta.hashes[c] ||= {}), S = (c) => (meta.seqs[c] ||= {});
  const api = async (path, opt = {}) => {
    const r = await fetchFn(cfg.url.replace(/\/$/, '') + path, { ...opt, headers: { authorization: 'Bearer ' + cfg.token, 'content-type': 'application/json' } });
    if (r.status === 401) throw new Error('رمز الدخول غير صالح');
    if (!r.ok) throw new Error('خطأ الخادم ' + r.status);
    return r.json();
  };
  function pending() {
    const out = [];
    for (const c of COLLS) {
      const seen = new Set();
      for (const rec of db[c] || []) { seen.add(rec.id); const h = hash(rec); if (H(c)[rec.id] !== h) out.push({ coll: c, id: rec.id, data: rec, h, ts: now(), baseSeq: S(c)[rec.id] || 0 }); }
      for (const id of Object.keys(H(c))) if (!seen.has(id)) out.push({ coll: c, id, data: null, h: null, ts: now(), baseSeq: S(c)[id] || 0 });
    }
    return out;
  }
  async function push() {
    let sent = 0;
    const all = pending();
    for (let i = 0; i < all.length; i += 500) {
      const chunk = all.slice(i, i + 500);
      const r = await api('/api/push', { method: 'POST', body: JSON.stringify({ changes: chunk.map(({ h, ...c }) => c) }) });
      const byKey = new Map(chunk.map((c) => [c.coll + '|' + c.id, c]));
      for (const x of r.results) { const c = byKey.get(x.coll + '|' + x.id); if (!c || x.error) continue; if (c.data == null) { delete H(c.coll)[c.id]; delete S(c.coll)[c.id]; } else { H(c.coll)[c.id] = c.h; S(c.coll)[c.id] = x.seq; } sent++; }
      // المرفوضة: السيرفر أحدث؛ سيصل بالسحب ويستبدل النسخة المحلية. نُصفّر البصمة لتُطبَّق نسخة السيرفر دون إعادة دفع.
      for (const x of r.rejected) { H(x.coll)[x.id] = '__stale__'; S(x.coll)[x.id] = 0; }
      // ممنوعة بالصلاحيات: نسحب السجل المحلي ونوقف إعادة المحاولة
      for (const x of r.forbidden || []) { const a = db[x.coll]; const i = a.findIndex((o) => o.id === x.id); if (x.server) { if (i >= 0) a[i] = x.server; else a.push(x.server); H(x.coll)[x.id] = hash(x.server); S(x.coll)[x.id] = x.seq; } else { if (i >= 0) a.splice(i, 1); delete H(x.coll)[x.id]; delete S(x.coll)[x.id]; } meta.forbidden = (meta.forbidden || 0) + 1; }
    }
    return sent;
  }
  async function pull() {
    let got = 0;
    for (;;) {
      const r = await api('/api/pull?since=' + (meta.cursor || 0));
      for (const x of r.records) {
        const arr = (db[x.coll] ||= []); const i = arr.findIndex((o) => o.id === x.id);
        if (x.data == null) { if (i >= 0) arr.splice(i, 1); delete H(x.coll)[x.id]; delete S(x.coll)[x.id]; }
        else { if (i >= 0) arr[i] = x.data; else arr.push(x.data); H(x.coll)[x.id] = hash(x.data); S(x.coll)[x.id] = x.seq; }
        got++;
      }
      meta.cursor = Math.max(meta.cursor || 0, r.more ? r.next : r.seq);
      if (!r.more) break;
    }
    return got;
  }
  // firstMode: 'merge' (يدمج بيانات الجهاز مع السيرفر) | 'replace' (يستبدل بيانات الجهاز بنسخة السيرفر)
  async function sync({ firstMode = 'merge' } = {}) {
    if (meta.cursor == null && firstMode === 'replace') { for (const c of COLLS) db[c] = []; meta.hashes = {}; meta.seqs = {}; }
    const pushed = await push(); const pulled = await pull(); meta.lastSync = now();
    return { pushed, pulled };
  }
  return { sync, push, pull, pending, me: () => api('/api/me') };
}
