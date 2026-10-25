// فلتر الجلسات + المستفيدون بلا تكرار (خادم على 8765)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => { console.log(ok ? 'ok  ' : 'FAIL', m); if (!ok) process.exitCode = 1; };
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demo]'); await pg.waitForTimeout(800);
await pg.click('a[data-go=sessions]'); await pg.waitForSelector('#sfbar');
const sum = async () => { const t = await pg.textContent('#sfsum'); return +(t.match(/(\d+)\s*جلسة/)?.[1] ?? -1); };
const rows = () => pg.locator('#sesslog table tr').count();
const total = await sum(); log('إجمالي الجلسات ظاهر (' + total + ')', total > 5);
const info = await pg.evaluate(() => { const d = window.__nawa.db, p = d.projects.find((x) => x.id === window.__nawa.ui.projectId) || d.projects[0]; const ss = d.sessions.filter((s) => s.projectId === p.id); const dates = ss.map((s) => s.date).sort(); return { mid: dates[Math.floor(dates.length / 2)], act: ss[0].activityId, ctr: ss[0].centerId, nAct: ss.filter((s) => s.activityId === ss[0].activityId).length, nCtr: ss.filter((s) => s.centerId === ss[0].centerId).length, nFrom: ss.filter((s) => s.date >= dates[Math.floor(dates.length / 2)]).length, nRoll: ss.filter((s) => s.mode === 'roll').length }; });
await pg.fill('[data-sf=from]', info.mid); await pg.waitForTimeout(400); log('من تاريخ: ' + (await sum()) + ' = ' + info.nFrom, (await sum()) === info.nFrom);
await pg.click('#sf-reset'); await pg.waitForSelector('#sfbar');
await pg.selectOption('[data-sf=act]', info.act); await pg.waitForTimeout(400); log('نشاط: ' + (await sum()) + ' = ' + info.nAct, (await sum()) === info.nAct);
await pg.selectOption('[data-sf=center]', info.ctr); await pg.waitForTimeout(300); const both = await sum(); log('نشاط + مركز ≤ كل منهما (' + both + ')', both <= info.nAct && both <= info.nCtr);
await pg.click('#sf-reset'); await pg.waitForSelector('#sfbar'); await pg.selectOption('[data-sf=mode]', 'roll'); await pg.waitForTimeout(300); log('نمط أسماء: ' + (await sum()) + ' = ' + info.nRoll, (await sum()) === info.nRoll);
await pg.fill('[data-sf=q]', 'نص-غير-موجود-أبدًا'); await pg.waitForTimeout(500); log('بحث بلا نتائج يعرض رسالة', (await sum()) === 0 && /لا جلسات مطابقة/.test(await pg.textContent('#sesslog')));
await pg.click('#sf-reset'); await pg.waitForSelector('#sfbar'); await pg.selectOption('[data-sf=status]', 'error'); await pg.waitForTimeout(400); const er = await sum(); await pg.selectOption('[data-sf=status]', 'ok'); await pg.waitForTimeout(400); const okn = await sum();
log(`فلتر التحقق: أخطاء ${er} + سليمة ${okn} ≤ ${total}`, er + okn <= total);
const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.click('#sf-xl')]); log('تصدير Excel للنتائج', !!dl);
// المستفيدون بلا تكرار
await pg.click('a[data-go=bnf]'); await pg.waitForSelector('#uqres');
const uqTbl = async () => pg.evaluate(() => [...document.querySelectorAll('#uqres tr')].map((r) => [...r.children].map((c) => c.textContent.trim())));
let t = await uqTbl(); log('جدول بلا تكرار يظهر (' + (t.length - 2) + ' نشاط)', t.length >= 3);
const last = t[t.length - 1]; const uniqTotal = +last[3], sumRows = t.slice(1, -1).reduce((a, r) => a + +r[3], 0);
log(`الإجمالي بلا تكرار ${uniqTotal} ≤ مجموع الصفوف ${sumRows}`, uniqTotal <= sumRows && uniqTotal > 0);
const expected = await pg.evaluate(() => { const d = window.__nawa.db, s = new Set(); for (const x of d.sessions) if (x.mode === 'roll') for (const id of x.attendance || []) if (d.beneficiaries.some((b) => b.id === id)) s.add(id); return s.size; });
log('الإجمالي = عدّ مستقل (' + expected + ')', uniqTotal === expected);
await pg.selectOption('[data-uq=by]', 'center'); await pg.waitForTimeout(300); t = await uqTbl(); log('عرض حسب المركز', /المركز/.test(t[0][0]));
await pg.selectOption('[data-uq=by]', 'project'); await pg.waitForTimeout(300); t = await uqTbl(); log('عرض حسب المشروع', /المشروع/.test(t[0][0]));
await pg.fill('[data-uq=from]', '2099-01-01'); await pg.dispatchEvent('[data-uq=from]', 'change'); await pg.waitForTimeout(300); log('فترة بلا جلسات تعرض رسالة', /لا جلسات/.test(await pg.textContent('#uqres')));
// الشريط الجانبي يتحرك مع التمرير ولا يبقى ثابتًا، ولا حقول وحدات/مجموعة في النموذج
await pg.click('a[data-go=sessions]'); await pg.waitForSelector('#sfbar'); log('لا حقل وحدات ولا مجموعة', (await pg.$('#su')) === null && (await pg.$('#sg')) === null && (await pg.$('[data-sf=grp]')) === null);
await pg.evaluate(() => window.scrollTo(0, 900)); await pg.waitForTimeout(200); const sb = await pg.evaluate(() => { const r = document.querySelector('aside').getBoundingClientRect(); return { top: r.top, h: r.height, doc: document.documentElement.scrollHeight, y: scrollY }; });
log(`الشريط الجانبي عائم ويلازم الشاشة عند التمرير (top=${Math.round(sb.top)}, h=${Math.round(sb.h)}, page=${sb.doc})`, sb.y > 0 && Math.abs(sb.top - 12) <= 2 && sb.h < sb.doc);
log('لا أخطاء في الصفحة: ' + (errs.join('|') || '—'), errs.length === 0); await b.close();
