// الشريط الجانبي: بلا تمرير داخلي؛ إن طال عن الشاشة يتحرك مع الصفحة
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = { name: 'مدير النظام', label: 'مدير النظام', title: 'أخصائي تقنية المعلومات', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: true, read: {}, write: {}, hidden: {} } };
for (const h of [560, 700, 1000]) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: h }, serviceWorkers: 'block' })).newPage();
  await p.route('**/api/**', (r) => { const u = r.request().url(); r.fulfill({ contentType: 'application/json', body: u.endsWith('/api/me') ? JSON.stringify(me) : '{"changes":[],"seq":0,"ok":true}' }); });
  await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  const m = await p.evaluate(() => { const a = document.querySelector('aside'); return { inner: a.scrollHeight > a.clientHeight + 2, pos: getComputedStyle(a).position, h: a.getBoundingClientRect().height, vh: innerHeight }; });
  ok(!m.inner, `${h}: بلا تمرير داخلي (${Math.round(m.h)}px، ${m.pos})`);
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
