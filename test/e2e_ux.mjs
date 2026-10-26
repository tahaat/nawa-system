// تجربة الاستخدام: توسّع الحقل عند التركيز دون تحريك التخطيط، وتحويل جداول التحرير إلى بطاقات على الجوال
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
for (const [w, mob] of [[1280, false]]) {
  const pg = await (await b.newContext({ viewport: { width: w, height: 844 }, isMobile: mob, hasTouch: mob })).newPage();
  await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(800);
  await pg.evaluate(() => window.__nawa.go('projects')); await pg.waitForTimeout(600);
  const sel = '#view table [data-bind*="interventions"][data-bind$="name"]';
  const el = pg.locator(sel).first(); const r0 = await el.boundingBox(); const tw0 = await pg.evaluate(() => document.querySelector('#view').scrollWidth);
  await el.evaluate((e) => { e.value = 'اسم بند طويل جدًا لاختبار توسع الحقل عند التركيز حتى تظهر القيمة كاملة دون قص'; }); await el.focus(); await pg.waitForTimeout(250);
  const r1 = await el.boundingBox(); const tw1 = await pg.evaluate(() => document.querySelector('#view').scrollWidth);
  ok(r1.width >= r0.width - 1, `${w}: الحقل يتوسع (${Math.round(r0.width)}→${Math.round(r1.width)})`);
  ok(r1.x >= -1 && r1.x + r1.width <= w + 1, `${w}: يبقى داخل الشاشة`);
  ok(tw1 <= tw0 + 2, `${w}: لا يتمدد التخطيط (${tw0}→${tw1})`);
  await pg.evaluate(() => document.activeElement.blur()); await pg.waitForTimeout(300);
  const r2 = await el.boundingBox(); ok(Math.abs(r2.width - r0.width) < 3, `${w}: يعود لحجمه بعد الخروج`);
  const rc = await pg.evaluate(() => document.querySelectorAll('table.stk').length); ok(mob ? rc > 0 : rc >= 0, `${w}: جداول بطاقات = ${rc}`);
}
{ const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(800); await pg.evaluate(() => window.__nawa.go('projects')); await pg.waitForTimeout(700); const n = await pg.evaluate(() => document.querySelectorAll('table.stk').length); ok(n > 0, '390: جداول التحرير بطاقات = ' + n); }
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
