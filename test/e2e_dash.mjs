// ضبط كل بطاقة بمفردها: مقياس المحور، محور ثانٍ، ارتفاع، شفافية، فترة (يتطلب خادماً على 8765 يخدم dist)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900); await pg.click('a[data-go=dash]'); await pg.waitForTimeout(600);
const ch = (id) => pg.evaluate((id) => { const c = window.__nawa.charts().find((x) => x.canvas.id === id); return c && { ytype: c.options.scales.y?.type, ymax: c.scales.y?.max, y2: !!c.scales.y2, h: c.canvas.parentElement.clientHeight, ds1: c.data.datasets[1]?.yAxisID }; }, id);
let c = await ch('c3'); log(`c3 افتراضي: ${JSON.stringify(c)}`, c.ytype !== 'logarithmic' && !c.y2);
log('أيقونة الضبط تنبّه لقيم متباعدة في بطاقة واحدة على الأقل', (await pg.$$('button.cg.warn')).length >= 1);
await pg.click('[data-cid=c3] .cg'); await pg.waitForSelector('#panel [data-cs=max]');
await pg.fill('#panel [data-cs=max]', '300'); await pg.dispatchEvent('#panel [data-cs=max]', 'change'); await pg.waitForTimeout(500); c = await ch('c3'); log(`أعلى قيمة 300: ymax=${c.ymax}`, c.ymax === 300);
await pg.selectOption('#panel [data-cs=log]', '1'); await pg.waitForTimeout(500); c = await ch('c3'); log(`مقياس لوغاريتمي: ${c.ytype}`, c.ytype === 'logarithmic');
await pg.selectOption('#panel [data-cs=log]', ''); await pg.check('#panel [data-cs=y2]'); await pg.waitForTimeout(600); c = await ch('c3'); log(`محور ثانٍ: y2=${c.y2} ds1=${c.ds1}`, c.y2 && c.ds1 === 'y2');
const c5 = await ch('c5'); log('البطاقات الأخرى لم تتأثر', !c5.y2 && c5.ytype !== 'logarithmic');
await pg.fill('#panel [data-cs=h]', '420'); await pg.dispatchEvent('#panel [data-cs=h]', 'change'); await pg.waitForTimeout(500); c = await ch('c3'); log(`ارتفاع 420: ${c.h}`, Math.abs(c.h - 420) < 6);
await pg.$eval('#panel [data-cs=alpha]', (e) => { e.value = 25; e.dispatchEvent(new Event('input', { bubbles: true })); }); await pg.waitForTimeout(200);
log('الشفافية 25 تُطبَّق على البطاقة نفسها', (await pg.$eval('[data-cid=c3]', (e) => e.style.getPropertyValue('--ca'))) === '25' && (await pg.$eval('[data-cid=c5]', (e) => e.style.getPropertyValue('--ca'))) === '55');
await pg.selectOption('#panel [data-cs=per]', '30'); await pg.waitForTimeout(500); log('الفترة لبطاقة واحدة', (await pg.evaluate(() => JSON.parse(localStorage.getItem('nawa.cards')).c3.per)) === '30');
await pg.screenshot({ path: '/tmp/card_set.png' });
await pg.click('#panel [data-act=cardReset]'); await pg.waitForTimeout(500); c = await ch('c3'); log('إعادة ضبط البطاقة', !c.y2 && c.ytype !== 'logarithmic');
// الإنجليزية
await pg.click('[data-act=lang]'); await pg.waitForTimeout(600); await pg.click('[data-cid=c2] .cg'); await pg.waitForTimeout(300); log('اللوحة بالإنجليزية', /Card settings/.test(await pg.textContent('#panel')));
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
