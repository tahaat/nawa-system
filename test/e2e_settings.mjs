// القوائم والإعدادات: تسميات، متغيرات تؤثر في التحقق، قوائم مخصصة (+choices)، حزمة مشروع، حزمة إعدادات
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }), pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => d.accept());
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
await pg.click('a[data-go=settings]'); await pg.waitForTimeout(400);
// 1) تسمية فئة
await pg.fill('[data-s="groupAr.youth"]', 'فتيان وشباب'); await pg.press('[data-s="groupAr.youth"]', 'Tab'); await pg.fill('[data-s="groupEn.youth"]', 'Young people'); await pg.press('[data-s="groupEn.youth"]', 'Tab');
await pg.reload(); await pg.waitForSelector('#nav'); await pg.waitForTimeout(500); await pg.click('a[data-go=settings]'); await pg.waitForTimeout(400);
log('تسمية الفئة محفوظة بعد إعادة التحميل', (await pg.inputValue('[data-s="groupAr.youth"]')) === 'فتيان وشباب');
// 2) متغير
await pg.click('[data-act=sTab][data-k=vars]'); await pg.waitForTimeout(200); await pg.fill('[data-sv=nameMinWords]', '2'); await pg.press('[data-sv=nameMinWords]', 'Tab'); await pg.waitForTimeout(300);
log('المتغير ظاهر وقابل للاستعادة', (await pg.locator('[data-act=sVarReset]').count()) === 1);
await pg.click('[data-act=sVarsReset]'); await pg.waitForTimeout(200); log('استعادة الافتراضيات', (await pg.locator('[data-act=sVarReset]').count()) === 0);
// 3) قائمة مخصصة
await pg.click('[data-act=sTab][data-k=lists]'); await pg.waitForTimeout(200);
await pg.click('[data-act=sNewList]'); await pg.waitForTimeout(300); await pg.fill('#dlg-in', 'الأحياء'); await pg.click('#dlg-ok'); await pg.waitForTimeout(400);
log('قائمة جديدة', (await pg.locator('#slist option').count()) >= 1 && (await pg.locator('#slist').innerText()).includes('الأحياء'));
await pg.click('[data-act=sAddItem]'); await pg.fill('[data-si="0.ar"]', 'الرمال'); await pg.fill('[data-si="0.en"]', 'Rimal'); await pg.press('[data-si="0.en"]', 'Tab');
await pg.click('[data-act=sAddItem]'); await pg.fill('[data-si="1.ar"]', 'النصيرات'); await pg.fill('[data-si="1.en"]', 'Nuseirat'); await pg.press('[data-si="1.en"]', 'Tab'); await pg.waitForTimeout(200);
const [d] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=sListsXls]')]); await d.saveAs('/tmp/lists.xlsx'); log('تصدير القوائم choices', fs.statSync('/tmp/lists.xlsx').size > 3000);
// 4) منشئ الاستبيانات يملأ الخيارات من القائمة
await pg.click('a[data-go=surveys]'); await pg.waitForTimeout(500); await pg.click('[data-fb=new]'); await pg.waitForTimeout(300); await pg.click('[data-fb=addq][data-type=select_one]'); await pg.waitForTimeout(300);
await pg.selectOption('[data-fblist]', { index: 1 }); await pg.waitForTimeout(400); const ch = await pg.locator('textarea[data-lines]').inputValue(); console.log(JSON.stringify(ch)); log('الخيارات من القائمة المخصصة', /الرمال\|Rimal/.test(ch) && /النصيرات\|Nuseirat/.test(ch));
// 5) حزمة مشروع: تصدير، حذف، استيراد
await pg.click('a[data-go=settings]'); await pg.waitForTimeout(300); await pg.click('[data-act=sTab][data-k=projects]'); await pg.waitForTimeout(300);
const before = await pg.evaluate(() => { const n = window.__nawa.db; return { p: n.projects.length, s: n.sessions.length, sh: n.sheets.length, b: n.beneficiaries.length }; });
const [d2] = await Promise.all([pg.waitForEvent('download'), pg.locator('[data-act=sPExp]').first().click()]); await d2.saveAs('/tmp/pkg.json'); const pk = JSON.parse(fs.readFileSync('/tmp/pkg.json', 'utf8')); log(`حزمة المشروع (${pk.sessions.length} جلسة، ${pk.beneficiaries.length} مستفيد)`, pk.app === 'nawa-project' && pk.sessions.length > 0);
await pg.locator('[data-act=sPDel]').first().click(); await pg.waitForTimeout(300); await pg.click('#dlg-ok'); await pg.waitForTimeout(500);
const mid = await pg.evaluate(() => { const n = window.__nawa.db; return { p: n.projects.length, s: n.sessions.length, sh: n.sheets.length, ops: n.ops.length }; }); log(`الحذف الكامل (جلسات بعد الحذف: ${mid.s})`, mid.p === before.p - 1 && mid.s < before.s);
await pg.setInputFiles('#spfile', '/tmp/pkg.json'); await pg.click('[data-act=sPImp]'); await pg.waitForTimeout(800); if (await pg.locator('#dlg-ok').count()) await pg.click('#dlg-ok'); await pg.waitForTimeout(500);
const after = await pg.evaluate(() => { const n = window.__nawa.db; return { p: n.projects.length, s: n.sessions.length, sh: n.sheets.length, b: n.beneficiaries.length }; }); log(`الاستيراد يعيد البيانات ${JSON.stringify(after)}`, after.p === before.p && after.s === before.s && after.sh === before.sh);
await pg.locator('[data-act=sPDup]').first().click(); await pg.waitForTimeout(500); log('نسخ الهيكل', (await pg.evaluate(() => window.__nawa.db.projects.length)) === before.p + 1);
// 6) حزمة الإعدادات
await pg.click('a[data-go=settings]'); await pg.waitForTimeout(300); await pg.click('[data-act=sTab][data-k=bundle]'); await pg.waitForTimeout(200);
const [d3] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=sBExp]')]); await d3.saveAs('/tmp/set.json'); const sj = JSON.parse(fs.readFileSync('/tmp/set.json', 'utf8')); log('تصدير الإعدادات يحوي القوائم والتسميات', sj.config.lists.length === 1 && sj.config.groupAr?.youth === 'فتيان وشباب');
console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close();
