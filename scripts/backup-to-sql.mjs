// يحوّل ملف نسخة احتياطية (JSON من «نسيج») إلى ملف SQL لاستعادته:
//   node scripts/backup-to-sql.mjs naseej-backup-2026-10-27.json > restore.sql
//   npx wrangler d1 execute naseej --remote --file=restore.sql
// تنبيه: يستبدل محتوى الجداول (records/users/policy/meta) بما في النسخة.
import { readFileSync } from 'node:fs';
const b = JSON.parse(readFileSync(process.argv[2], 'utf8')); if (b.app !== 'naseej' || !b.tables) { console.error('ملف غير صالح'); process.exit(1); }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const out = ['-- استعادة نسخة نسيج ' + b.at];
for (const t of ['records', 'users', 'policy', 'meta']) {
  const rows = b.tables[t] || []; out.push(`DELETE FROM ${t};`);
  for (const r of rows) { const k = Object.keys(r); out.push(`INSERT INTO ${t}(${k.join(',')}) VALUES(${k.map((c) => lit(r[c])).join(',')});`); }
}
console.log(out.join('\n'));
