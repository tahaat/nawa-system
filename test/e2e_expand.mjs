// حقول النص تلتف أسطرها فتظهر القيمة كاملة (بلا قص) وتعكس التعديل في قاعدة البيانات
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok  ', m); };
for (const [w, h, mob] of [[390, 800, true], [820, 900, true], [1280, 800, false]]) {
  const pg = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
  await pg.evaluate(() => window.__nawa.go('projects')); await pg.waitForTimeout(700);
  const sel = '[data-bind="p|name"]';
  ok(await pg.$eval(sel, (e) => e.tagName === 'TEXTAREA'), `${w}: الحقل الطويل صار ملتفًّا`);
  ok(await pg.$eval(sel, (e) => e.scrollHeight <= e.clientHeight + 3), `${w}: القيمة ظاهرة كاملة بلا قص`);
  const full = await pg.inputValue(sel); await pg.fill(sel, full + ' ✓'); await pg.press(sel, 'Enter'); await pg.waitForTimeout(300);
  ok((await pg.evaluate(() => window.__nawa.db.projects[0].name)).endsWith('✓'), `${w}: التعديل يُحفظ (Enter يُنهي التحرير)`);
  const cut = await pg.evaluate(() => [...document.querySelectorAll('#view td textarea.wrapta')].filter((e) => e.offsetParent && e.scrollHeight > e.clientHeight + 3).length); ok(cut === 0, `${w}: لا حقل مقتطع في الجداول (${cut})`);
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(ov <= 1, `${w}: لا تمرير أفقي`);
  ok(!errs.length, `${w}: بلا أخطاء ${errs.join('|')}`);
}
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
