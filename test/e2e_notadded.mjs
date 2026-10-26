// حساب Access غير مُضاف: تظهر شاشة الحجب فقط، بلا قوائم ولا أزرار إنشاء
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), p = await b.newPage(); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
await p.route('**/api/**', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"not provisioned"}' }));
await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
const txt = await p.evaluate(() => document.body.innerText);
ok(/حسابك غير مُضاف/.test(txt), 'رسالة الحجب');
ok(await p.locator('#nb-r').count() === 1, 'زر إعادة المحاولة');
const top = await p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!e.closest('div[style*="99999"]'); });
ok(top, 'الشاشة تغطي التطبيق');
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
