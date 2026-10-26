// مؤشر الاستهلاك للمدير: حلقة في الشريط العلوي + لوحة تفصيل
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = (mu) => ({ name: 'مدير', label: 'مدير', title: '', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: mu, read: {}, write: {}, hidden: {} } });
const use = { day: '2026-10-26', reqToday: 72000, reqMonth: 900000, last: [{ day: '2026-10-25', req: 5000 }, { day: '2026-10-26', req: 72000 }], dbBytes: 3 * 1048576, limits: { reqDay: 100000, dbBytes: 500 * 1048576 } };
for (const mu of [true, false]) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' })).newPage(); let hits = 0; p.on('console', (m) => /usage/.test(m.text()) && console.log('C:', m.text()));
  await p.route('**/api/**', (r) => { const u = r.request().url(); if (u.endsWith('/api/me')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(me(mu)) }); if (u.endsWith('/api/usage')) { hits++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify(use) }); } return r.fulfill({ contentType: 'application/json', body: '{"changes":[],"seq":0,"ok":true}' }); });
  await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  const n = await p.locator('#top .usage').count(); ok(mu ? n === 1 : n === 0, `manageUsers=${mu}: المؤشر ${mu ? 'يظهر' : 'مخفي'}`);
  if (mu) { await p.waitForTimeout(600); console.log('hits', hits, await p.getAttribute('#top .usage', 'title')); ok(/72%/.test(await p.getAttribute('#top .usage', 'title')), 'النسبة 72% (طلبات اليوم)'); await p.click('#top .usage'); const t = await p.locator('#usagecard').innerText(); ok(/72,000/.test(t) && /3\.0 MB/.test(t), 'اللوحة تعرض الأرقام'); await p.screenshot({ path: '/tmp/usage.png' }); }
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
