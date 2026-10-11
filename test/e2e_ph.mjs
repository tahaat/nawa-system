// كل حقل نصي/رقمي في كل شاشة له نص توضيحي (مثال على صيغة التعبئة)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
let bad = 0; const SK = 'file,checkbox,radio,range,date,time,hidden,color,button,submit,password,datetime-local,month';
for (const r of ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'projects', 'plan', 'centers', 'surveys', 'users', 'cloud', 'export', 'gloss', 'settings']) {
  await pg.evaluate((r) => window.__nawa.go(r), r); await pg.waitForTimeout(500);
  const miss = await pg.evaluate((SK) => [...document.querySelectorAll('#view input:not([placeholder]),#view textarea:not([placeholder])')].filter((e) => !SK.split(',').includes((e.type || 'text').toLowerCase()) && !e.readOnly && !e.disabled).map((e) => (e.id || e.dataset.bind || e.name || e.className || e.type)).slice(0, 6), SK);
  if (miss.length) { bad++; console.log('FAIL', r, miss); } else console.log('ok  ', r);
}
const ex = await pg.evaluate(() => { window.__nawa.go('bnf'); return null; }); await pg.waitForTimeout(400);
console.log(await pg.evaluate(() => ['#bq', '#bn', '#bp', '#bem'].map((s) => document.querySelector(s)?.placeholder)));
console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close(); process.exit(bad ? 1 : 0);
