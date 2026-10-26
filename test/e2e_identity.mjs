// هوية الحساب: الاسم + المسمى + الدور في الشريط العلوي والجانبي، وبطاقة التعريف مع تسجيل الخروج
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const me = { name: 'حنين أبو سليم', label: 'حنين أبو سليم', title: 'منسقة إدارية في قسم المتابعة والتقييم', email: 'h.salim@nawaculture.org', access: true, role: 'meal', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: false, read: {}, write: {}, hidden: {} } };
for (const [w, h] of [[1280, 800], [390, 800]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.route('**/api/me', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(me) }));
  await p.route('**/api/**', (r) => (r.request().url().endsWith('/api/me') ? r.fallback() : r.fulfill({ contentType: 'application/json', body: '{"changes":[],"seq":0,"ok":true}' })));
  await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
  await p.goto('http://localhost:8765/'); await p.waitForSelector('#top .idchip', { timeout: 8000 }).catch(() => {});
  const chip = await p.locator('#top .idchip').innerText().catch(() => '');
  ok(/حنين أبو سليم/.test(chip) && /منسقة إدارية في قسم المتابعة والتقييم/.test(chip), `${w}: الاسم والمسمى في الشريط العلوي: ${chip}`);
  if (w > 800) { const who = await p.locator('#whoami').innerText(); ok(/حنين/.test(who) && /منسق\/مسؤول المتابعة/.test(who), 'الشريط الجانبي: ' + who); }
  await p.click('#top .idchip'); const card = await p.locator('#idcard').innerText();
  ok(/h\.salim@nawaculture\.org/.test(card) && /تسجيل الخروج/.test(card), 'بطاقة الهوية: ' + card.slice(0, 80));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(ov <= 2, 'لا تمرير أفقي ' + ov);
  await p.screenshot({ path: `/tmp/id_${w}.png` });
  if (w > 800) { const [req] = await Promise.all([p.waitForRequest('**/cdn-cgi/access/logout', { timeout: 4000 }).catch(() => null), p.click('#idcard [data-act=logout]')]); ok(!!req, 'تسجيل الخروج يتجه إلى Access logout'); }
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
