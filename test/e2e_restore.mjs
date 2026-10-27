// شاشة الاستعادة: رفع ملف، معاينة بالأرقام، تأكيد، تطبيق
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'; import { writeFileSync } from 'node:fs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = { name: 'مدير', label: 'مدير', title: '', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: true, read: {}, write: {}, hidden: {} } };
writeFileSync('/tmp/bkui.json', JSON.stringify({ app: 'naseej', version: 1, at: '2026-10-27T00:00:00Z', tables: { records: [{ coll: 'sessions', id: 's1', data: JSON.stringify({ date: '2026-03-05', educator: 'ريم', centerId: 'c1', activityId: 'a1', projectId: 'p1' }), ts: 1, deleted: 0, project: 'p1' }, { coll: 'sessions', id: 's2', data: '{}', ts: 1, deleted: 0, project: 'p1' }, { coll: 'centers', id: 'c1', data: JSON.stringify({ name: 'مركز الخضر' }), ts: 1, deleted: 0, project: null }, { coll: 'projects', id: 'p1', data: JSON.stringify({ name: 'مشروع تجريبي', activities: [{ id: 'a1', name: 'ورشة رسم' }] }), ts: 1, deleted: 0, project: null }, { coll: 'beneficiaries', id: 'b1', data: JSON.stringify({ name: 'سلمى أحمد' }), ts: 1, deleted: 0, project: null }] } }));
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })).newPage(); const calls = [];
const C1 = { sessions: { missing: 0, revive: 1, newer: 0, skip: 1 } };
await p.route('**/api/**', (r) => {
  const u = r.request().url();
  if (u.endsWith('/api/restore')) { const body = JSON.parse(r.request().postData()); calls.push(body); return r.fulfill({ contentType: 'application/json', body: JSON.stringify(body.apply ? { ok: true, applied: 1, counts: C1 } : { ok: true, preview: true, total: 2, counts: C1, items: [{ coll: 'sessions', id: 's1', kind: 'missing' }, { coll: 'sessions', id: 's2', kind: 'revive' }] }) }); }
  r.fulfill({ contentType: 'application/json', body: u.endsWith('/api/me') ? JSON.stringify(me) : '{"changes":[],"seq":0,"ok":true,"reqToday":1,"reqMonth":1,"last":[],"dbBytes":1,"limits":{"reqDay":1,"dbBytes":1}}' });
});
await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
await p.goto('http://localhost:8765/'); await p.waitForTimeout(2200); await p.evaluate(() => window.__nawa.go('cloud')); await p.waitForTimeout(700);
await p.setInputFiles('#rsfile', '/tmp/bkui.json'); await p.waitForSelector('[data-act=rsPreview]'); const tx = await p.locator('#rscard').innerText(); ok(tx.includes('الجلسات (2)') && tx.includes('المستفيدون (1)'), 'الملف قُرئ بأعداد المجموعات');
ok(await p.locator('[data-act=rsApply]').isDisabled(), 'التطبيق معطّل قبل المعاينة');
for (const c of ['beneficiaries', 'centers', 'projects']) await p.uncheck('[data-rsc=' + c + ']'); await p.click('[data-act=rsPreview]'); await p.waitForSelector('#rscard table');
ok(calls[0].apply === false && calls[0].colls.join() === 'sessions' && calls[0].mode === 'missing', 'المعاينة أُرسلت بالتصفية الصحيحة');
ok(/إجمالي ما سيُعاد: 2/.test(await p.locator('#rscard').innerText()) && !(await p.locator('[data-act=rsApply]').isDisabled()), 'نتيجة المعاينة وتفعيل زر التطبيق');
const lt = await p.locator('#rslist').innerText(); ok(lt.includes('ورشة رسم') && lt.includes('2026-03-05') && lt.includes('مركز الخضر'), 'القائمة تعرض اسم النشاط والتاريخ والمركز');
await p.uncheck('[data-rsi="sessions|s2"]'); ok(/المحدد:\s*1/.test(await p.locator('#rsn').innerText()), 'عدّاد المحدد');
await p.fill('#rsq', 'xyz'); ok(!(await p.locator('#rslist').innerText()).includes('ورشة'), 'البحث يصفّي'); await p.fill('#rsq', 'ورشة');
await p.click('[data-act=rsApply]'); await p.click('#dlg-ok'); await p.waitForTimeout(500);
ok(calls[1]?.apply === true && calls[1].ids.join() === 'sessions|s1' && /أُعيد 1 سجلًا/.test(await p.locator('#rscard').innerText()), 'التطبيق بعد التأكيد');
await p.screenshot({ path: '/tmp/restore.png' });
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
