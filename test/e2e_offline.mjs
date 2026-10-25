// بلا إنترنت: بعد أول فتح يُخزَّن البرنامج، ثم قطع الشبكة وإعادة التحميل تبقى الصفحة والبيانات تعمل (يُخدَّم تحت مسار فرعي كما في GitHub Pages)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1300, height: 850 } }), pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
const U = 'http://localhost:8765/';
await pg.goto(U); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(800);
await pg.click('a[data-go=export]'); await pg.waitForTimeout(500);
await pg.waitForFunction(() => navigator.serviceWorker.controller || false, null, { timeout: 8000 }).catch(async () => { await pg.reload(); await pg.waitForSelector('#nav'); });
await pg.waitForTimeout(1200); await pg.reload(); await pg.waitForSelector('#nav'); await pg.waitForTimeout(800);
log('ملف الخدمة يتحكم بالصفحة', await pg.evaluate(() => !!navigator.serviceWorker.controller));
const keys = await pg.evaluate(async () => (await (await caches.open('nawa-v2')).keys()).map((r) => new URL(r.url).pathname)); console.log(keys); log('الملفات الأساسية مخزّنة', keys.includes('/index.html') || keys.includes('/'));
const before = await pg.evaluate(() => window.__nawa.db.sessions.length);
await ctx.setOffline(true); await pg.reload(); await pg.waitForSelector('#nav', { timeout: 8000 }); await pg.waitForTimeout(800);
log('فتح الصفحة بلا اتصال', (await pg.title()).includes('نوى') || (await pg.locator('#nav a').count()) > 5);
const after = await pg.evaluate(() => window.__nawa.db.sessions.length); log(`البيانات محفوظة بلا اتصال (${after} جلسة)`, after === before && after > 0);
await pg.click('a[data-go=dash]'); await pg.waitForTimeout(700); log('لوحة القيادة تعمل بلا اتصال', (await pg.locator('a.kpi').count()) >= 4);
await pg.click('a[data-go=export]'); await pg.waitForTimeout(400); log('بطاقة «العمل بلا إنترنت» تظهر الجاهزية', /جاهز للعمل بلا إنترنت/.test(await pg.locator('#pwast').innerText()));
await ctx.setOffline(false); console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close();
