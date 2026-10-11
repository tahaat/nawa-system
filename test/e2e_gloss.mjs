// الترجمة: قاموس مخصص، ترجمة الناقص عبر الإنترنت (مُحاكاة)، حفظها، عدم إرسال أسماء المستفيدين، تصدير/استيراد
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }), pg = await ctx.newPage(); const errs = [], sent = [];
pg.on('pageerror', (e) => errs.push(e.message));
await ctx.route(/translate\.googleapis\.com|mymemory/, (r) => { const u = new URL(r.request().url()), q = u.searchParams.get('q'); sent.push(q); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([[['EN:' + q, q]]]) }); });
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
// نص ناقص: نُسجّل مشروعًا باسم عربي غير معروف وبنفيًّا باسم مستفيد
await pg.evaluate(() => { const n = window.__nawa; n.db.projects[0].name = 'مشروع الحكايات الجديدة'; n.db.beneficiaries.push({ id: 'zz1', name: 'سلمى عبد الرحمن', demo: true }); n.db.centers[0].name = 'مركز الأمل الجديد'; n.go('dash'); });
await pg.click('[data-act=lang]'); await pg.waitForTimeout(600); await pg.click('a[data-go=sessions]'); await pg.waitForTimeout(400); await pg.click('a[data-go=gloss]'); await pg.waitForTimeout(500);
let t = await pg.locator('#view').innerText(); log('شاشة الترجمة بالإنجليزية', /Translation/.test(t) && /Glossary/.test(t));
const mis = await pg.locator('#view .card:nth-of-type(2) td[data-notr]').allInnerTexts(); console.log('ناقص:', mis.slice(0, 6)); log('نصوص ناقصة مُجمَّعة', mis.length > 0);
await pg.evaluate(() => { window.__nawa.db.beneficiaries.push({ id: 'zz2', name: 'مشروع الحكايات الجديدة اسم', demo: true }); });
// ترجمة تدوينية يدوية
await pg.fill('#gnew', 'مرحبا بالجميع'); await pg.fill('#gnewen', 'Welcome all'); await pg.click('[data-act=gAdd]'); await pg.waitForTimeout(300);
await pg.fill('#gq', 'مرحبا بالجميع'); await pg.waitForTimeout(500); t = await pg.locator('#view').innerText(); log('إضافة ترجمة مخصصة', /Welcome all|مخصص|Custom/.test(t));
await pg.fill('#gq', '');
// ترجمة عبر الإنترنت
await pg.click('[data-act=gTrNow]'); await pg.waitForTimeout(1500);
console.log('أُرسل:', sent.slice(0, 5)); log('أُرسلت نصوص للمزوّد', sent.length > 0);
log('لم يُرسَل اسم مستفيد', !sent.some((x) => /سلمى عبد الرحمن/.test(x)));
const st = await pg.evaluate(() => document.querySelector('#gmsg')?.textContent); console.log(st);
// دائمة: تعاد بعد إعادة التحميل بلا اتصال
await pg.reload(); await pg.waitForSelector('#nav'); await ctx.setOffline(true); await pg.waitForTimeout(500);
await pg.click('[data-act=lang]').catch(() => {}); await pg.waitForTimeout(400);
await pg.click('a[data-go=gloss]'); await pg.waitForTimeout(400); await pg.selectOption('#gf', 'online'); await pg.waitForTimeout(300);
const rows = await pg.locator('#view .card:last-of-type td[data-notr]').count(); log(`ترجمات الإنترنت محفوظة بعد إعادة التحميل بلا اتصال (${rows})`, rows > 0);
await ctx.setOffline(false);
// تصدير/استيراد
const [d] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=gJson]')]); const jf = '/tmp/g.json'; await d.saveAs(jf); const j = JSON.parse(fs.readFileSync(jf, 'utf8')); log(`تصدير JSON (${j.pairs.length} مدخل)`, j.pairs.length > 0);
const [d2] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=gXls]')]); await d2.saveAs('/tmp/g.xlsx'); log('تصدير Excel', fs.statSync('/tmp/g.xlsx').size > 3000);
fs.writeFileSync('/tmp/imp.csv', 'تجربة الاستيراد,Import test\nمرحبا بالجميع,Hello everyone\n'); await pg.setInputFiles('#gfile', '/tmp/imp.csv'); await pg.click('[data-act=gImp]'); await pg.waitForTimeout(500); t = await pg.locator('#gmsg').innerText(); log('استيراد CSV: ' + t, /1/.test(t));
await pg.setInputFiles('#gfile', '/tmp/g.xlsx'); await pg.click('[data-act=gImp]'); await pg.waitForTimeout(700); t = await pg.locator('#gmsg').innerText(); log('استيراد Excel: ' + t, /\d/.test(t));
console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close();
