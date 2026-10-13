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
// أعمدة الجدول
await pg.selectOption('#pckind', 'activity'); await pg.waitForTimeout(300);
const rows0 = await pg.locator('.pctab tr').count(); log('جدول الأعمدة معروض', rows0 > 5);
await pg.check('[data-pc="cols.2.hide"]'); await pg.waitForTimeout(400); h = await prev(); log('حذف عمود العمر من الطباعة', await pg.evaluate((x) => !new DOMParser().parseFromString(x, 'text/html').querySelector('table.rost')?.textContent.includes('العمر'), h));
await pg.click('[data-act=pcAddCol]'); await pg.waitForTimeout(400); h = await prev(); log('إدراج عمود إضافي', h.includes('عمود جديد'));
await pg.fill('[data-px="0.fill"]', 'ملاحظة'); await pg.dispatchEvent('[data-px="0.fill"]', 'change'); await pg.waitForTimeout(400); h = await prev(); log('نص ثابت في العمود الإضافي', h.includes('ملاحظة'));
await pg.click('[data-act=pcAl][data-key="1"][data-h="left"][data-v="top"]'); await pg.waitForTimeout(400); h = await prev(); log('محاذاة 9 اتجاهات للعمود', /text-align:\s*left/.test(h));
await pg.selectOption('[data-px="0.pos"]', 'after:3'); await pg.waitForTimeout(400); h = await prev();
{ const n = await pg.evaluate((x) => { const t = new DOMParser().parseFromString(x, 'text/html').querySelector('table.rost'); return [t.textContent.includes('عمود جديد'), [...t.querySelectorAll('tr')].find((q) => q.firstElementChild?.textContent.trim() === '1').children.length]; }, h); log('عمود إضافي بعد عمود محدد داخل مجموعة الجنس ' + n, n[0] && n[1] === 8); }
await pg.fill('[data-pc="cols.7.split"]', '2'); await pg.dispatchEvent('[data-pc="cols.7.split"]', 'change'); await pg.waitForTimeout(400); h = await prev();
log('تقسيم عمود إلى جزأين', await pg.evaluate((x) => [...new DOMParser().parseFromString(x, 'text/html').querySelectorAll('table.rost tr')].find((q) => q.firstElementChild?.textContent.trim() === '1').children.length === 9, h));
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
