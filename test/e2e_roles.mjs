import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('nawa.testRoles', '1'); } catch {} }); const pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => { console.log(ok ? 'ok  ' : 'FAIL', m); if (!ok) process.exitCode = 1; };
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#rolepick', { timeout: 8000 });
log('نافذة اختيار الدور تظهر أول تشغيل', true);
const roleBtn = (r) => pg.click(`#rolepick [data-r="${r}"]`);
const links = async () => (await pg.$$eval('#nav a', (a) => a.map((x) => x.dataset.go)));
// 1) مدخل بيانات حر بلا رمز
await roleBtn('entry'); await pg.click('#rp-ok'); await pg.waitForSelector('#rolepick', { state: 'detached' });
let l = await links(); log('المدخل: لا إعدادات ولا مشاريع (' + l.join(',') + ')', !l.includes('settings') && !l.includes('projects') && l.includes('bnf'));
// 2) ربط مجلد حقيقي (OPFS) كي يُكتب roles.pin
await pg.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getDirectoryHandle('core', { create: true }); await window.__nawa.useHandle(r); });
// 3) مدير بلا رموز سابقة ← إنشاء رمز المدير
await pg.click('[data-act=roleSwitch]'); await roleBtn('admin'); await pg.fill('#rp-p1', 'abc'); await pg.fill('#rp-p2', 'abc'); await pg.click('#rp-ok'); await pg.waitForFunction(() => document.getElementById('rp-m')?.textContent);
log('رفض رمز قصير', /6/.test(await pg.textContent('#rp-m')));
await pg.fill('#rp-p1', 'Admin-2026'); await pg.fill('#rp-p2', 'Admin-2026'); await pg.click('#rp-ok'); await pg.waitForSelector('#rolepick', { state: 'detached' });
l = await links(); log('المدير يرى كل الشاشات (' + l.length + ')', l.includes('settings') && l.includes('cloud'));
const f = await pg.evaluate(async () => { const r = await navigator.storage.getDirectory(); const d = await r.getDirectoryHandle('core'); try { return await (await (await d.getFileHandle('roles.pin')).getFile()).text(); } catch { return null; } });
log('roles.pin كُتب في core ولا يحوي الرمز نصًا', !!f && !f.includes('Admin-2026') && JSON.parse(f).roles.admin?.hash);
// 4) ضبط رموز المشاريع والمتابعة من بطاقة الرموز
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForSelector('#pin_projects');
await pg.fill('#pin_projects', 'Proj-2026'); await pg.fill('#pin_meal', 'Meal-2026'); await pg.click('[data-act=pinsSave]');
await pg.waitForFunction(() => /حُفظت/.test(document.getElementById('pinmsg')?.textContent || ''));
log('حفظ رموز الأدوار', /المجلد/.test(await pg.textContent('#pinmsg')));
// 5) تبديل إلى مسؤول مشاريع: خاطئ ثم صحيح، ورمز مدير لا يفتح دور المشاريع
await pg.click('[data-act=roleSwitch]'); await roleBtn('projects');
await pg.fill('#rp-p1', 'Admin-2026'); await pg.click('#rp-ok'); await pg.waitForFunction(() => document.getElementById('rp-m')?.textContent); log('رمز المدير لا يفتح دور المشاريع', /غير صحيح/.test(await pg.textContent('#rp-m')));
await pg.fill('#rp-p1', 'Proj-2026'); await pg.click('#rp-ok'); await pg.waitForSelector('#rolepick', { state: 'detached' });
l = await links(); log('مسؤول المشاريع: يرى المشاريع ولا الإعدادات (' + l.join(',') + ')', l.includes('projects') && !l.includes('settings'));
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForTimeout(300);
log('بطاقة الرموز مخفية عن غير المدير', (await pg.$('#pin_admin')) === null);
// 6) بعد إعادة التحميل يبقى الدور
await pg.reload(); await pg.waitForTimeout(1200); log('الدور محفوظ بعد التحديث', (await pg.$('#rolepick')) === null && (await links()).includes('projects'));
// 7) تغيير الرمز من المدير يُسقط دور المشاريع عند المزامنة التالية
await pg.evaluate(async () => { const r = await navigator.storage.getDirectory(); const d = await r.getDirectoryHandle('core'); const fh = await d.getFileHandle('roles.pin'); const j = JSON.parse(await (await fh.getFile()).text()); j.roles.projects.hash = 'AAAAAAAAAAAA' + j.roles.projects.hash.slice(12); const w = await fh.createWritable(); await w.write(JSON.stringify(j)); await w.close(); });
await pg.evaluate(async () => { await window.__nawa.useHandle(await navigator.storage.getDirectory()); });
await pg.click('[data-act=roleSwitch]'); await pg.click('#rp-x'); // إلغاء
// 8) الكتابة في حقل الرمز لا تُمسح عند مزامنة تلقائية
await pg.click('[data-act=roleSwitch]'); await roleBtn('admin'); await pg.fill('#rp-p1', 'Admin-2026'); await pg.click('#rp-ok'); await pg.waitForSelector('#rolepick', { state: 'detached' });
await pg.evaluate(() => window.__nawa.go('cloud')); await pg.waitForSelector('#pin_meal'); await pg.fill('#pin_meal', 'Typing-123'); await pg.evaluate(async () => { document.querySelector('#pin_meal').blur(); await new Promise((r) => setTimeout(r, 200)); document.getElementById('ca')?.dispatchEvent(new Event('change', { bubbles: true })); });
await pg.waitForTimeout(6500); log('ما كُتب في حقل الرمز يبقى بعد المزامنة التلقائية', (await pg.inputValue('#pin_meal')) === 'Typing-123');
log('لا أخطاء في الصفحة: ' + (errs.join('|') || '—'), errs.length === 0);
await b.close();
