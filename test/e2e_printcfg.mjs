// إعدادات الطباعة: التبويب، التخزين لكل نوع، تطبيقها على المعاينة
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
await pg.click('a[data-go=settings]'); await pg.waitForTimeout(300); await pg.click('[data-act=sTab][data-k=print]'); await pg.waitForSelector('#pcprev');
const prev = () => pg.evaluate(() => document.querySelector('#pcprev').srcdoc);
let h = await prev(); log('المعاينة تحوي هيدر وفوتر ثابتين', /fxh/.test(h) && /fxf/.test(h));
await pg.selectOption('#pckind', 'course'); await pg.waitForTimeout(300);
await pg.fill('[data-pc="marks.absent"]', 'غ'); await pg.dispatchEvent('[data-pc="marks.absent"]', 'change'); await pg.waitForTimeout(400);
h = await prev(); log('رمز الغياب المخصص للدورات يظهر في المعاينة', h.includes('>غ<') && !h.includes('>غـ<'));
await pg.uncheck('[data-pc="show.stamp"]'); await pg.waitForTimeout(400); h = await prev(); log('إخفاء عبارة «مستند مراقب»', !h.includes('مستند مراقب'));
await pg.selectOption('[data-pc="orient"]', 'portrait'); await pg.waitForTimeout(400); h = await prev(); log('اتجاه عمودي مفروض', /size:793/.test(h));
await pg.selectOption('#pckind', 'activity'); await pg.waitForTimeout(300); const v = await pg.inputValue('[data-pc="marks.absent"]'); log('نوع آخر لا يتأثر باستثناءات الدورات', v === 'غـ');
await pg.reload(); await pg.waitForSelector('#nav'); await pg.click('a[data-go=settings]'); await pg.click('[data-act=sTab][data-k=print]'); await pg.selectOption('#pckind', 'course'); await pg.waitForTimeout(300);
log('الحفظ يبقى بعد إعادة التحميل', (await pg.inputValue('[data-pc="marks.absent"]')) === 'غ');
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
