// يحوّل نسخة احتياطية (JSON من «نسيج») إلى SQL للاستعادة على D1.
//   node scripts/backup-to-sql.mjs نسخة.json [--mode=missing|newer|full] [--coll=sessions,beneficiaries] [--project=ID] [--since=2026-10-01] > restore.sql
//   npx wrangler d1 execute naseej --remote --file=restore.sql
// الأوضاع:
//   missing (الافتراضي، آمن): يعيد فقط ما حُذف أو فُقد؛ لا يمسّ أي سجل موجود وغير محذوف.
//   newer  : يعيد أيضًا السجلات التي نسختُها أحدث من الموجود (للتراجع عن تعديل خاطئ يعني اختيار نسخة أقدم يدويًا: استعمل full).
//   full   : يستبدل records وusers وpolicy وmeta بالكامل بما في النسخة.
// كل سجل مُعاد يأخذ رقم تسلسل (seq) جديدًا أعلى من الحالي ليصل إلى كل الأجهزة عند مزامنتها.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2), file = args.find((a) => !a.startsWith('--')), opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
if (!file) { console.error('الاستعمال: node scripts/backup-to-sql.mjs نسخة.json [--mode=missing|newer|full] [--coll=..] [--project=..] [--since=YYYY-MM-DD]'); process.exit(1); }
const b = JSON.parse(readFileSync(file, 'utf8')); if (b.app !== 'naseej' || !b.tables) { console.error('ملف غير صالح'); process.exit(1); }
const mode = opt.mode || 'missing', colls = opt.coll ? new Set(opt.coll.split(',')) : null, since = opt.since ? Date.parse(opt.since) : 0;
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const out = [`-- استعادة نسيج (${mode}) من نسخة ${b.at}`];
if (mode === 'full') {
  for (const t of ['records', 'users', 'policy', 'meta']) { out.push(`DELETE FROM ${t};`); for (const r of b.tables[t] || []) { const k = Object.keys(r); out.push(`INSERT INTO ${t}(${k.join(',')}) VALUES(${k.map((c) => lit(r[c])).join(',')});`); } }
  out.push("UPDATE meta SET v=v+1000000 WHERE k='seq';", "UPDATE records SET seq=seq+1000000;", "-- رُفع التسلسل ليصل التغيير لكل الأجهزة");
} else {
  const rows = (b.tables.records || []).filter((r) => (!colls || colls.has(r.coll)) && (!opt.project || r.project === opt.project) && (!since || r.ts >= since));
  let n = 0;
  for (const r of rows) {
    const k = Object.keys(r).filter((c) => c !== 'seq'), seq = "(SELECT v FROM meta WHERE k='seq')+1", cols = k.join(',') + ',seq', vals = k.map((c) => lit(r[c])).join(',') + ',' + seq;
    if (r.deleted) continue;                                    // لا نعيد سجلًا كان محذوفًا وقت النسخة
    const cond = mode === 'newer' ? `OR (records.ts < ${r.ts})` : '';
    // يُدرج المفقود؛ ويُحيي المحذوف (deleted=1) أو الأقدم (في وضع newer) بنسخة النسخة الاحتياطية
    out.push(`INSERT INTO records(${cols}) VALUES(${vals}) ON CONFLICT(coll,id) DO UPDATE SET data=excluded.data, ts=excluded.ts, deleted=0, seq=excluded.seq, by_user=excluded.by_user, center=excluded.center, project=excluded.project WHERE records.deleted=1 ${cond};`);
    out.push(`UPDATE meta SET v=v+1 WHERE k='seq' AND changes()>0;`); n++;
  }
  out.push(`-- عدد السجلات المرشّحة للاستعادة: ${n}`);
}
console.log(out.join('\n'));
