// واجهة عربية/إنجليزية: تبديل اللغة والاتجاه والخط، وبقاء خط التصدير (يتطلب خادماً على 8765 يخدم dist)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.env.URL || 'http://localhost:8765/', shots = process.env.SHOTS || '/tmp';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 950 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto(url); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
const st = () => pg.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, font: getComputedStyle(document.body).fontFamily.split(',')[0], h1: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0], loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + f.weight).join(' ') }));
let s = await st(); log(`عربي: ${JSON.stringify(s)}`, s.dir === 'rtl' && /Tajawal/.test(s.font));
await pg.screenshot({ path: `${shots}/ui_ar_dash.png` });
await pg.click('[data-act=lang]'); await pg.waitForTimeout(700); s = await st();
const nav = await pg.$$eval('#nav a', (a) => a.map((x) => x.textContent)); const arLeft = await pg.evaluate(() => (document.body.innerText.match(/[؀-ۿ]+/g) || []).length);
log(`إنجليزي: dir=${s.dir} nav=${nav.slice(0, 4).join('|')}`, s.dir === 'ltr' && s.lang === 'en' && nav.includes('Dashboard'));
console.log('كلمات عربية متبقية في لوحة القيادة:', arLeft);
await pg.screenshot({ path: `${shots}/ui_en_dash.png` });
for (const r of ['sheets', 'ops', 'plan', 'bnf', 'check']) { const a = await pg.$(`a[data-go=${r}]`); if (!a) continue; await a.click(); await pg.waitForTimeout(500); const n = await pg.evaluate(() => (document.body.innerText.match(/[؀-ۿ]+/g) || []).length); console.log(r, 'عربي متبقٍ:', n); await pg.screenshot({ path: `${shots}/ui_en_${r}.png`, fullPage: true }); }
await pg.click('[data-act=lang]'); await pg.waitForTimeout(500); s = await st(); log('العودة إلى العربية', s.dir === 'rtl' && /الإنجاز|لوحة/.test(await pg.textContent('#nav')));
await pg.click('a[data-go=projects]'); await pg.waitForTimeout(300);
log('الملاحظات التوجيهية صارت تلميحات (ⓘ)', (await pg.$$('.hint')).length >= 2 && (await pg.$$('.card>p.small')).length === 0);
await (await pg.$('.hint')).hover(); await pg.waitForTimeout(200); log('البوب يظهر عند اقتراب المؤشر', await pg.isVisible('#hintpop'));
const bg0 = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor); await pg.click('[data-act=theme]'); await pg.waitForTimeout(300);
const bg1 = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor); log(`الوضع المظلم: ${bg0} → ${bg1}`, bg0 !== bg1 && (await pg.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
await pg.click('a[data-go=dash]'); await pg.waitForTimeout(300); await (await pg.$('a.kpi')).hover(); await pg.waitForTimeout(250);
log('مصدر البطاقة يظهر كبوب عند التمرير', /المصدر|Source/.test(await pg.textContent('#hintpop')) && (await pg.$$('a.kpi .src')).length === 0);
const w0 = await pg.evaluate(() => document.querySelector('main').getBoundingClientRect().width); await pg.click('[data-act=side]'); await pg.waitForTimeout(500);
const w1 = await pg.evaluate(() => document.querySelector('main').getBoundingClientRect().width); log(`طي الشريط الجانبي: عرض الصفحة ${Math.round(w0)} → ${Math.round(w1)}`, w1 > w0 + 150);
await pg.click('[data-act=side]'); await pg.waitForTimeout(500); log('إظهاره من جديد', (await pg.evaluate(() => document.querySelector('main').getBoundingClientRect().width)) < w1 - 150);
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
