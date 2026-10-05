// المزامنة عبر مجلد OneDrive (أو أي مجلد متزامن): كل جهاز يكتب ملفه الخاص فقط ⇒ لا تعارض ملفات.
// البنية: <الجذر>/<قناة>/<deviceId>.json ، القنوات: core (مشاريع/مراكز/مستفيدون…) ، pii (حقول حساسة) ، c-<مركز> (جلسات وردود المركز)
// الصلاحيات = صلاحيات مشاركة المجلدات في OneDrive؛ الجهاز لا يرى إلا القنوات المتزامنة إليه.
import { hash } from './sync.js';
import { COLLS } from './sync.js';

export const PII_FIELDS = ['phone', 'disabilityType'];
const rkey = (coll, id) => `${coll}|${id}`;
export function chanOf(coll, rec) {
  if (coll === 'sessions') return rec?.centerId ? `c-${rec.centerId}` : 'core';
  if (coll === 'surveyResponses') return rec?.answers?.center ? `c-${rec.answers.center}` : 'core';
  return 'core';
}
// يقسم السجل إلى أجزاء حسب القناة
export function parts(coll, rec, canWritePii) {
  if (coll !== 'beneficiaries') return [{ chan: chanOf(coll, rec), part: '', data: rec }];
  const core = { ...rec }, pii = {}; for (const f of PII_FIELDS) if (f in rec) { pii[f] = rec[f]; delete core[f]; }
  const out = [{ chan: 'core', part: '', data: core }];
  if (canWritePii) out.push({ chan: 'pii', part: 'pii', data: pii });
  return out;
}
export const newFolderMeta = () => ({ deviceId: 'dev_' + Math.random().toString(36).slice(2, 10), hashes: {}, chan: {}, lastSync: null });

// dir: { channels(): Promise<string[]>, ensure(ch): Promise<void>, list(ch): Promise<[{name,mtime,size}]>, read(ch,name): Promise<string>, write(ch,name,text): Promise<void> }
export function createFolderSync({ db, meta, dir, now = () => Date.now() }) {
  const cache = new Map();   // "ch/name" -> {sig, entries}
  const mine = {};           // ch -> { key: {ts,data,coll,id,part} }
  const dirty = new Set();

  async function loadAll(chs) {
    const all = [];
    for (const ch of chs) for (const f of await dir.list(ch)) {
      if (!f.name.endsWith('.json')) continue;
      const k = ch + '/' + f.name, sig = f.mtime + ':' + f.size;
      let c = cache.get(k);
      if (!c || c.sig !== sig) {
        try { const j = JSON.parse(await dir.read(ch, f.name)); c = { sig, device: j.device, entries: j.entries || {} }; } catch { c = { sig, device: f.name, entries: {} }; }
        cache.set(k, c);
      }
      all.push({ ch, name: f.name, ...c });
    }
    return all;
  }

  async function sync({ firstMode = 'merge', allowWrite = true } = {}) {
    const res = { wrote: 0, applied: 0, deleted: 0, channels: [], errors: [] };
    const chs = await dir.channels(); res.channels = chs;
    if (firstMode === 'replace' && !meta.lastSync) { for (const c of COLLS) db[c] = []; meta.hashes = {}; meta.chan = {}; }
    const hasPii = chs.includes('pii');
    // 1) ملفاتي الحالية (للحفاظ على ما كتبتُه سابقًا)
    const files = await loadAll(chs);
    for (const f of files) if (f.name === meta.deviceId + '.json') { mine[f.ch] = { ...f.entries }; }
    // 2) كشف تغييراتي المحلية
    const nowTs = now(), seen = new Set();
    const put = (ch, coll, id, part, data) => { (mine[ch] ||= {}); mine[ch][`${rkey(coll, id)}|${part}`] = { ts: nowTs, data, coll, id, part }; dirty.add(ch); };
    for (const coll of COLLS) for (const rec of db[coll] || []) {
      const rk = rkey(coll, rec.id); seen.add(rk); const h = hash(rec);
      if (meta.hashes[rk] === h) continue;
      for (const p of parts(coll, rec, hasPii)) put(p.chan, coll, rec.id, p.part, p.data);
      meta.chan[rk] = chanOf(coll, rec); meta.hashes[rk] = h;
    }
    for (const rk of Object.keys(meta.hashes)) if (!seen.has(rk)) {
      const [coll, id] = rk.split('|'); const ch = meta.chan[rk] || 'core';
      put(ch, coll, id, '', null); if (coll === 'beneficiaries' && hasPii) put('pii', coll, id, 'pii', null);
      delete meta.hashes[rk]; delete meta.chan[rk];
    }
    // 3) كتابة ملفاتي
    for (const ch of [...dirty]) {
      if (!allowWrite) break;
      if (!chs.includes(ch)) { res.errors.push(`لا صلاحية/مجلد للقناة «${ch}» على هذا الجهاز — التغييرات معلّقة`); continue; }
      try { await dir.write(ch, meta.deviceId + '.json', JSON.stringify({ v: 1, device: meta.deviceId, entries: mine[ch] })); dirty.delete(ch); res.wrote++; cache.delete(ch + '/' + meta.deviceId + '.json'); }
      catch (e) { res.errors.push(`تعذّرت الكتابة في «${ch}»: ${e.message}`); }
    }
    // القنوات التي تعذّرت: نتراجع عن تسجيل البصمة كي يُعاد اكتشاف التغيير لاحقًا (حتى بعد إعادة تشغيل التطبيق)
    for (const ch of [...dirty]) {
      for (const [k, e] of Object.entries(mine[ch] || {})) if (e.ts === nowTs) {
        const rk = rkey(e.coll, e.id); delete mine[ch][k];
        if (e.data == null) { meta.hashes[rk] = '__pending_delete__'; meta.chan[rk] = ch; } else delete meta.hashes[rk];
      }
      dirty.delete(ch);
    }
    // 4) الدمج: لكل (سجل، جزء) أحدث نسخة من كل الأجهزة
    const all = await loadAll(chs); const best = new Map();
    const consider = (ch, dev, k, e) => { const cur = best.get(k); if (!cur || e.ts > cur.ts || (e.ts === cur.ts && dev > cur.dev)) best.set(k, { ...e, ch, dev }); };
    for (const f of all) for (const [k, e] of Object.entries(f.entries)) consider(f.ch, f.device, k, e);
    const recs = new Map(); // rk -> {core, pii}
    for (const [k, e] of best) { const rk = rkey(e.coll, e.id); const o = recs.get(rk) || {}; o[e.part || 'core'] = e; recs.set(rk, o); }
    for (const [rk, o] of recs) {
      const core = o.core; if (!core) continue;
      const [coll, id] = rk.split('|'); const arr = (db[coll] ||= []); const i = arr.findIndex((r) => r.id === id);
      if (core.data == null) { if (i >= 0) { arr.splice(i, 1); res.deleted++; } delete meta.hashes[rk]; delete meta.chan[rk]; continue; }
      let rec = { ...core.data };
      if (o.pii && o.pii.data) rec = { ...rec, ...o.pii.data };
      else if (!hasPii && i >= 0) for (const f of PII_FIELDS) if (f in arr[i]) rec[f] = arr[i][f]; // لا نمحو ما لدينا إن لم تصلنا القناة
      const h = hash(rec); if (meta.hashes[rk] === h && i >= 0) continue;
      if (i >= 0) arr[i] = rec; else arr.push(rec);
      meta.hashes[rk] = hash(rec); meta.chan[rk] = core.ch; res.applied++;
    }
    meta.lastSync = now();
    return res;
  }
  const pending = () => { let n = 0; for (const coll of COLLS) for (const rec of db[coll] || []) if (meta.hashes[rkey(coll, rec.id)] !== hash(rec)) n++; return n; };
  return { sync, pending };
}
