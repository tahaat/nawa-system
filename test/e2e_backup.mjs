// النسخ الاحتياطي: بطاقة للمدير فقط، وتنزيل ملف النسخة، وتحويل النسخة إلى SQL
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'; import { execFileSync } from 'node:child_process'; import { writeFileSync, readFileSync } from 'node:fs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = (mu) => ({ name: 'مدير', label: 'مدير', title: '', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: mu, read: {}, write: {}, hidden: {} } });
const bk = { app: 'naseej', version: 1, at: '2026-10-27T00:00:00Z', counts: { records: 1 }, tables: { records: [{ coll: 'projects', id: "p'1", data: '{"n":"x"}', ts: 5, deleted: 0, seq: 1, by_user: 'a', center: null, project: 'p1' }], users: [{ email: 'a@x.org', name: 'مدير', title: null, role: 'admin', centers: '[]', assignments: '[]', active: 1, last_login: null }], policy: [], meta: [{ k: 'seq', v: 1 }], audit: [] } };
for (const mu of [true, false]) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', acceptDownloads: true })).newPage();
  await p.route('**/api/**', (r) => { const u = r.request().url(); r.fulfill({ contentType: 'application/json', body: u.endsWith('/api/me') ? JSON.stringify(me(mu)) : u.endsWith('/api/backup') ? JSON.stringify(bk) : u.endsWith('/api/usage') ? '{"reqToday":1,"reqMonth":1,"last":[],"dbBytes":1,"limits":{"reqDay":100000,"dbBytes":1000}}' : '{"changes":[],"seq":0,"ok":true}' }); });
  await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(2200); await p.evaluate(() => window.__nawa.go('cloud')); await p.waitForTimeout(700);
  const n = await p.locator('#bkcard').count(); ok(mu ? n === 1 : n === 0, `manageUsers=${mu}: بطاقة النسخ ${mu ? 'تظهر' : 'مخفية'}`);
  if (mu) { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 6000 }), p.click('[data-act=bkDl]')]); const path = await d.path(); const j = JSON.parse(readFileSync(path, 'utf8')); ok(/^naseej-backup-\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename()) && j.app === 'naseej', 'تنزيل ملف النسخة: ' + d.suggestedFilename());
    writeFileSync('/tmp/bk.json', JSON.stringify(bk)); const sql = execFileSync('node', ['scripts/backup-to-sql.mjs', '/tmp/bk.json']).toString(); ok(/INSERT INTO records/.test(sql) && /'p''1'/.test(sql) && /DELETE FROM users/.test(sql) && /NULL/.test(sql), 'تحويل النسخة إلى SQL (اقتباس وNULL)'); }
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
