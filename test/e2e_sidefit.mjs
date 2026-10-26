// الشريط الجانبي: بلا تمرير داخلي ويبقى عائمًا مع التمرير (ولو كان أطول من الشاشة: يلتصق أسفله)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = { name: 'مدير النظام', label: 'مدير النظام', title: 'أخصائي تقنية المعلومات', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: true, read: {}, write: {}, hidden: {} } };
for (const h of [560, 700, 1000]) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: h }, serviceWorkers: 'block' })).newPage();
  await p.route('**/api/**', (r) => { const u = r.request().url(); r.fulfill({ contentType: 'application/json', body: u.endsWith('/api/me') ? JSON.stringify(me) : '{"changes":[],"seq":0,"ok":true}' }); });
  await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { const d = document.createElement('div'); d.style.height = '3000px'; document.getElementById('view').appendChild(d); });
  const m = await p.evaluate(() => { const a = document.querySelector('aside'); return { inner: a.scrollHeight > a.clientHeight + 2, h: a.getBoundingClientRect().height }; });
  ok(!m.inner, `${h}: بلا تمرير داخلي (${Math.round(m.h)}px)`);
  await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const a = document.querySelector('aside').getBoundingClientRect(); return { top: Math.round(a.top), bottom: Math.round(a.bottom), vh: innerHeight }; });
  ok(r.bottom <= r.vh + 1 && r.bottom >= r.vh - 40 || (r.top >= 0 && r.bottom <= r.vh), `${h}: يبقى ظاهرًا بعد النزول (top=${r.top} bottom=${r.bottom} vh=${r.vh})`);
  ok(r.bottom > 0 && r.top < r.vh, `${h}: لم يختفِ من الشاشة`);
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
