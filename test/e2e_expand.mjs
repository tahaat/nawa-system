// حقل الإدخال يتوسع عند الضغط ليُظهر القيمة كاملة، ويعكس التعديل في الحقل الأصلي
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok  ', m); };
for (const [w, h, mob] of [[390, 800, true], [600, 900, true]]) {   // الجوال/الآيباد: نافذة كتابة موسّعة؛ سطح المكتب يتوسع الحقل في مكانه (e2e_ux)
  const pg = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
  await pg.evaluate(() => window.__nawa.go('projects')); await pg.waitForTimeout(600);
  const sel = 'input[data-bind="p|name"]'; const full = await pg.inputValue(sel);
  await pg.click(sel); await pg.waitForSelector('.xp textarea', { timeout: 3000 }).catch(() => {});
  const shown = await pg.$eval('.xp textarea', (t) => t.value).catch(() => null);
  ok(shown === full, `${w}: النافذة تعرض القيمة كاملة`);
  await pg.fill('.xp textarea', full + ' ✓'); await pg.click('.xp-ok'); await pg.waitForTimeout(300);
  ok((await pg.evaluate(() => window.__nawa.db.projects[0].name)).endsWith('✓'), `${w}: التعديل يُحفظ في قاعدة البيانات`);
  ok((await pg.$('.xp-bg')) === null, `${w}: النافذة تُغلق`);
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(ov <= 1, `${w}: لا تمرير أفقي`);
  ok(!errs.length, `${w}: بلا أخطاء ${errs.join('|')}`);
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
