// شاشة الاستعادة: رفع ملف، معاينة بالأرقام، تأكيد، تطبيق
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'; import { writeFileSync } from 'node:fs';
const b = await chromium.launch(); let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const me = { name: 'مدير', label: 'مدير', title: '', email: 'a@nawaculture.org', access: true, role: 'admin', centers: [], projects: [], assignments: [], mustChange: false, seq: 0, policy: { routes: '*', manageUsers: true, read: {}, write: {}, hidden: {} } };
writeFileSync('/tmp/bkui.json', JSON.stringify({ app: 'naseej', version: 1, at: '2026-10-27T00:00:00Z', tables: { records: [{ coll: 'sessions', id: 's1', data: '{}', ts: 1, deleted: 0, project: 'p1' }, { coll: 'sessions', id: 's2', data: '{}', ts: 1, deleted: 0, project: 'p1' }, { coll: 'beneficiaries', id: 'b1', data: '{}', ts: 1, deleted: 0, project: null }] } }));
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })).newPage(); const calls = [];
const C1 = { sessions: { missing: 0, revive: 1, newer: 0, skip: 1 } };
await p.route('**/api/**', (r) => {
  const u = r.request().url();
  if (u.endsWith('/api/restore')) { const body = JSON.parse(r.request().postData()); calls.push(body); return r.fulfill({ contentType: 'application/json', body: JSON.stringify(body.apply ? { ok: true, applied: 1, counts: C1 } : { ok: true, preview: true, total: 1, counts: C1 }) }); }
  r.fulfill({ contentType: 'application/json', body: u.endsWith('/api/me') ? JSON.stringify(me) : '{"changes":[],"seq":0,"ok":true,"reqToday":1,"reqMonth":1,"last":[],"dbBytes":1,"limits":{"reqDay":1,"dbBytes":1}}' });
});
await p.route('http://localhost:8765/', async (r) => { const res = await r.fetch(); let t = await res.text(); t = t.replace('<head>', '<head><meta name="nawa-access" content="1">'); r.fulfill({ response: res, body: t }); });
await p.goto('http://localhost:8765/'); await p.waitForTimeout(2200); await p.evaluate(() => window.__nawa.go('cloud')); await p.waitForTimeout(700);
await p.setInputFiles('#rsfile', '/tmp/bkui.json'); await p.waitForSelector('[data-act=rsPreview]'); const tx = await p.locator('#rscard').innerText(); ok(tx.includes('الجلسات (2)') && tx.includes('المستفيدون (1)'), 'الملف قُرئ بأعداد المجموعات');
ok(await p.locator('[data-act=rsApply]').isDisabled(), 'التطبيق معطّل قبل المعاينة');
await p.uncheck('[data-rsc=beneficiaries]'); await p.click('[data-act=rsPreview]'); await p.waitForSelector('#rscard table');
ok(calls[0].apply === false && calls[0].colls.join() === 'sessions' && calls[0].mode === 'missing', 'المعاينة أُرسلت بالتصفية الصحيحة');
ok(/إجمالي ما سيُعاد: 1/.test(await p.locator('#rscard').innerText()) && !(await p.locator('[data-act=rsApply]').isDisabled()), 'نتيجة المعاينة وتفعيل زر التطبيق');
await p.click('[data-act=rsApply]'); await p.click('#dlg-ok'); await p.waitForTimeout(500);
ok(calls[1]?.apply === true && /أُعيد 1 سجلًا/.test(await p.locator('#rscard').innerText()), 'التطبيق بعد التأكيد');
await p.screenshot({ path: '/tmp/restore.png' });
console.log(bad ? 'FAILED ' + bad : 'OK'); await b.close(); process.exit(bad ? 1 : 0);
