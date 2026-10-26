import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('nawa.testRoles', '1'); } catch {} }); const pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => { console.log(ok ? 'ok  ' : 'FAIL', m); if (!ok) process.exitCode = 1; };
const roleBtn = (r) => pg.click(`#rolepick [data-r="${r}"]`);
const links = async () => (await pg.$$eval('#nav a', (a) => a.map((x) => x.dataset.go)));
const msgSet = () => pg.waitForFunction(() => document.getElementById('rp-m')?.textContent);
const closed = () => pg.waitForSelector('#rolepick', { state: 'detached' });
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#rolepick', { timeout: 8000 });
log('نافذة اختيار الدور تظهر أول تشغيل', true);
// 1) جهاز جديد بلا مجلد: لا يستطيع شيئًا سوى «اختيار المجلد أولًا»
await pg.click('#rp-setup'); await closed(); let l = await links(); log('وضع الإعداد: شاشة السحابة فقط (' + l.join(',') + ')', l.join() === 'cloud');
// 2) ربط مجلد حقيقي (OPFS)
await pg.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getDirectoryHandle('core', { create: true }); await window.__nawa.useHandle(r); });
// 3) مدير: رفض الرمز القصير، ثم إنشاء الرمز
await pg.click('#whoami [data-act=logout]').catch(() => {}); 
if (!(await pg.$('#rolepick'))) await pg.evaluate(() => document.querySelector('#whoami [data-act=logout]')?.click());
await roleBtn('admin'); await pg.fill('#rp-p1', '123'); await pg.fill('#rp-p2', '123'); await pg.click('#rp-ok'); await msgSet(); log('رفض رمز قصير', /4/.test(await pg.textContent('#rp-m')));
await pg.fill('#rp-p1', '482915'); await pg.fill('#rp-p2', '482915'); await pg.press('#rp-p2', 'Enter'); await closed();
l = await links(); log('المدير يرى كل الشاشات (' + l.length + ')', l.includes('settings') && l.includes('cloud'));
const f = await pg.evaluate(async () => { const r = await navigator.storage.getDirectory(); const d = await r.getDirectoryHandle('core'); try { return await (await (await d.getFileHandle('roles.pin')).getFile()).text(); } catch { return null; } });
log('roles.pin كُتب في core ولا يحوي الرمز نصًا', !!f && !f.includes('482915') && !!JSON.parse(f).roles.admin?.hash);
// 4) بطاقة الرموز: مشاريع + متابعة + مدخل بيانات
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForSelector('#pin_entry');
await pg.fill('#pin_projects', '731904'); await pg.fill('#pin_meal', '205861'); await pg.fill('#pin_entry', '6159'); await pg.press('#pin_entry', 'Enter');
await pg.waitForFunction(() => /حُفظت/.test(document.getElementById('pinmsg')?.textContent || '')); log('حفظ الرموز الثلاثة (Enter)', /المجلد/.test(await pg.textContent('#pinmsg')));
// 5) مدخل البيانات: رمز خاطئ ثم صحيح
await pg.click('#whoami [data-act=logout]'); await roleBtn('entry'); await pg.fill('#rp-p1', '731904'); await pg.press('#rp-p1', 'Enter'); await msgSet(); log('رمز دور آخر لا يفتح المدخل', /غير صحيح/.test(await pg.textContent('#rp-m')));
await pg.fill('#rp-p1', '6159'); await pg.press('#rp-p1', 'Enter'); await closed();
l = await links(); log('المدخل: لا إعدادات ولا مشاريع (' + l.join(',') + ')', !l.includes('settings') && !l.includes('projects') && l.includes('bnf'));
// 6) مسؤول مشاريع
await pg.click('#whoami [data-act=logout]'); await roleBtn('projects'); await pg.fill('#rp-p1', '482915'); await pg.click('#rp-ok'); await msgSet(); log('رمز المدير لا يفتح دور المشاريع', /غير صحيح/.test(await pg.textContent('#rp-m')));
await pg.fill('#rp-p1', '731904'); await pg.click('#rp-ok'); await closed();
l = await links(); log('مسؤول المشاريع: يرى المشاريع ولا الإعدادات (' + l.join(',') + ')', l.includes('projects') && !l.includes('settings'));
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForTimeout(300); log('بطاقة الرموز مخفية عن غير المدير', (await pg.$('#pin_admin')) === null);
// 7) بقاء الدور بعد التحديث
await pg.reload(); await pg.waitForTimeout(1200); log('الدور محفوظ بعد التحديث', (await pg.$('#rolepick')) === null && (await links()).includes('projects'));
// 8) الكتابة في حقل الرمز لا تُمسح بالمزامنة التلقائية
await pg.click('#whoami [data-act=logout]'); await roleBtn('admin'); await pg.fill('#rp-p1', '482915'); await pg.click('#rp-ok'); await closed();
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForSelector('#pin_meal'); await pg.fill('#pin_meal', '9988'); await pg.evaluate(async () => { document.querySelector('#pin_meal').blur(); await new Promise((r) => setTimeout(r, 200)); document.getElementById('ca')?.dispatchEvent(new Event('change', { bubbles: true })); });
await pg.waitForTimeout(6500); log('ما كُتب في حقل الرمز يبقى بعد المزامنة التلقائية', (await pg.inputValue('#pin_meal')) === '9988');
// 9) العين
await pg.click('#whoami [data-act=logout]'); await roleBtn('meal'); const t0 = await pg.getAttribute('#rp-p1', 'type'); await pg.fill('#rp-p1', '205861'); await pg.click('[data-eye=rp-p1]'); const t1 = await pg.getAttribute('#rp-p1', 'type');
log('الرمز مخفي ثم يظهر بالعين (' + t0 + '→' + t1 + ')', t0 === 'password' && t1 === 'text'); await pg.click('[data-eye=rp-p1]'); log('العين تخفيه ثانية', (await pg.getAttribute('#rp-p1', 'type')) === 'password');
await pg.press('#rp-p1', 'Enter'); await closed(); log('Enter يدخل الدور', (await pg.textContent('#top .idchip')).includes('المتابعة'));
log('لا أخطاء في الصفحة: ' + (errs.join('|') || '—'), errs.length === 0);
await b.close();
