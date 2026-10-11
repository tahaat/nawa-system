// ضبط عرض لوحة القيادة: الحجم والأعمدة والاتساع والفترة (يتطلب خادماً على 8765 يخدم dist)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900); await pg.click('a[data-go=dash]'); await pg.waitForTimeout(500);
await pg.click('#dc summary'); const kpi0 = await pg.$$eval('.kpis > a', (e) => e.length), w0 = await pg.$eval('.kpis > a', (e) => e.getBoundingClientRect().width);
await pg.selectOption('[data-d=kc]', '3'); await pg.waitForTimeout(200); const w1 = await pg.$eval('.kpis > a', (e) => e.getBoundingClientRect().width); log(`أعمدة المؤشرات 3: عرض البطاقة ${Math.round(w0)} → ${Math.round(w1)}`, w1 > w0 + 40);
await pg.selectOption('[data-d=cc]', '1'); await pg.waitForTimeout(300); const g = await pg.$eval('.dash .g2', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length); log(`أعمدة المخططات 1: ${g}`, g === 1);
await pg.selectOption('[data-d=w]', '960'); await pg.waitForTimeout(200); const dw = await pg.$eval('.dash', (e) => Math.round(e.getBoundingClientRect().width)); log(`اتساع ضيّق: ${dw}`, dw <= 960 * 1.05);
await pg.$eval('[data-d=scale]', (e) => { e.value = 85; e.dispatchEvent(new Event('input', { bubbles: true })); }); await pg.waitForTimeout(200); log('الحجم 85% يُحفظ', (await pg.evaluate(() => JSON.parse(localStorage.getItem('nawa.dash')).scale)) === 85);
const n0 = await pg.evaluate(() => window.__nawa.db.sessions.length); const s0 = (await pg.textContent('#dc summary'));
await pg.selectOption('[data-d=per]', '30'); await pg.waitForTimeout(500); const s1 = await pg.textContent('#dc summary'); log(`الفترة آخر 30 يوماً: ${s1.replace(/\s+/g, ' ').slice(0, 90)}`, /30 يومًا/.test(s1) && s1 !== s0);
await pg.selectOption('[data-d=per]', 'custom'); await pg.waitForTimeout(400); log('الفترة المخصصة تعرض حقلي التاريخ', (await pg.$$('[data-d=from],[data-d=to]')).length === 2);
await pg.fill('[data-d=from]', '2026-07-01'); await pg.fill('[data-d=to]', '2026-07-31'); await pg.waitForTimeout(500);
const k = await pg.$eval('.kpis > a b', (e) => e.textContent); console.log('جلسات يوليو:', k, 'من', n0);
await pg.screenshot({ path: '/tmp/dash_set.png' });
await pg.click('[data-act=dashReset]'); await pg.waitForTimeout(500); log('إعادة الضبط', (await pg.$$eval('.kpis > a', (e) => e.length)) === kpi0 && /كل مدة/.test(await pg.textContent('#dc summary')));
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
