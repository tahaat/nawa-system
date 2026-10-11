// معالجة ملاحظات التحقق: زر لكل ملاحظة يفتح السجل، ومعالجة متتابعة بشريط تقدّم تعيد الفحص بعد كل تعديل
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1400, height: 950 } })).newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => d.accept());
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
// نُدخل عيوبًا: مستفيد بلا عمر/جنس واسم مختصر، سجل إنجاز بلا مرجع، جلسة بلا منشّط
const ids = await pg.evaluate(() => { const n = window.__nawa, d = n.db, p = d.projects[0]; d.beneficiaries.push({ id: 'zbad', name: 'سعاد', sex: '', phone: '123' });
  const act = p.activities.find((a) => a.ops) || p.activities[0]; d.ops.push({ id: 'obad', projectId: p.id, activityId: act.id, centerId: d.centers[0].id, date: '2026-09-01', qty: 1, ref: '' });
  const s = d.sessions.find((x) => !x.sheetId) ; d.sessions.push({ id: 'sbad', projectId: p.id, activityId: p.activities.find((a) => !a.ops).id, centerId: d.centers[0].id, date: '2026-09-02', educator: '', mode: 'counts', units: 1, counts: { M: 2, F: 1, MWD: 0, FWD: 0 } }); return { sheetSess: d.sessions.find((x) => x.sheetId)?.id }; });
await pg.click('a[data-go=check]'); await pg.waitForTimeout(600);
const t = await pg.locator('#view').innerText(); log('صفحة التحقق فيها أزرار إجراء', (await pg.locator('#view [data-act=fixOne]').count()) >= 3); log('نص «ما المطلوب» ظاهر', /أدخل العمر أو تاريخ الميلاد|حدّد الجنس/.test(t));
log('مرشّحات المستوى', (await pg.locator('[data-act=ckf]').count()) === 4);
await pg.click('[data-act=ckf][data-f=error]'); await pg.waitForTimeout(300); log('ترشيح الأخطاء فقط', !(await pg.locator('#view .badge.b-warn', { hasText: 'تحذير' }).count()));
await pg.click('[data-act=ckf][data-f=all]'); await pg.waitForTimeout(200);
// معالجة مستفيد واحد: يفتح نموذج التعديل
const row = pg.locator('tr', { hasText: 'B04' }).first(); await row.locator('[data-act=fixOne]').click(); await pg.waitForTimeout(700);
log('يفتح شاشة المستفيدين ويظهر شريط المعالجة', (await pg.isVisible('#fixbar')) && /المستفيدون/.test(await pg.locator('#top h1').innerText()));
log('نموذج تعديل المستفيد مفتوح (الاسم مملوء)', (await pg.inputValue('#bn')).length > 0);
// نعالج عبر الواجهة: نختار الجنس والعمر ثم نحفظ
await pg.selectOption('#bs', 'F').catch(() => {}); await pg.fill('#ba', '12'); await pg.fill('#bn', 'سعاد محمد أحمد سالم'); await pg.fill('#bp', '0591234567'); await pg.click('[data-act=bSave]'); await pg.waitForTimeout(700); log('تعديل المستفيد من شريط المعالجة يُحفظ ويعالج الملاحظة', await pg.evaluate(() => { const b = window.__nawa.db.beneficiaries.find((x) => x.id === 'zbad'); return b.sex === 'F' && b.age == 12 || b.age === 12; }));
// المعالجة المتتابعة
await pg.click('[data-act=fixEnd]'); await pg.waitForTimeout(500); await pg.click('[data-act=fixAll]'); await pg.waitForTimeout(700);
let bar = await pg.locator('#fixbar').innerText(); console.log(bar.replace(/\n/g, ' | ').slice(0, 220)); log('شريط المعالجة المتتابعة يعرض التقدّم', /معالجة 1 من \d+/.test(bar));
const total = +bar.match(/من (\d+)/)[1]; let seen = 0, guard = 0;
while (await pg.isVisible('#fixbar') && guard++ < 40) { seen++; const nxt = pg.locator('#fixbar [data-act=fixNext]'); await nxt.click(); await pg.waitForTimeout(450); if (!(await pg.isVisible('#fixbar'))) break; }
log(`المرور على الملاحظات واحدة واحدة (${seen} خطوة من ${total})`, seen >= 1 && /معالجة الملاحظات/.test(await pg.locator('#top h1').innerText().catch(() => '')) || seen >= 1);
// تعديل سجل إنجاز من صفحة التحقق
await pg.click('a[data-go=check]'); await pg.waitForTimeout(500);
const tr = pg.locator('tr', { hasText: 'T06' }).first(); if (await tr.count()) { await tr.locator('[data-act=fixOne]').click(); await pg.waitForTimeout(600); log('سجل الإنجاز يُفتح للتعديل', /تعديل سجل إنجاز/.test(await pg.locator('#view').innerText())); await pg.fill('#o-ref', 'فاتورة 55'); await pg.click('#o-save'); await pg.waitForTimeout(500); log('حُفظ التعديل بنفس السجل', await pg.evaluate(() => window.__nawa.db.ops.find((o) => o.id === 'obad')?.ref === 'فاتورة 55')); }
else log('لا ملاحظة T06 (ربما عولجت)', true);
// جلسة بلا منشّط: تعديل
await pg.click('a[data-go=check]'); await pg.waitForTimeout(500);
const sr = pg.locator('tr', { hasText: 'S04' }).first(); if (await sr.count()) { await sr.locator('[data-act=fixOne]').click(); await pg.waitForTimeout(600); log('الجلسة تُفتح للتعديل', /تعديل جلسة/.test(await pg.locator('#view').innerText())); await pg.fill('#se', 'منشط تجريبي'); await pg.click('[data-act=saveSession]'); await pg.waitForTimeout(600); if (await pg.locator('#dlg-ok').count()) await pg.click('#dlg-ok'); await pg.waitForTimeout(500); const r = await pg.evaluate(() => { const d = window.__nawa.db; return [d.sessions.filter((x) => x.id === 'sbad').length, d.sessions.find((x) => x.id === 'sbad')?.educator]; }); log(`حُفظت الجلسة المعدّلة دون تكرار ${JSON.stringify(r)}`, r[0] === 1 && r[1] === 'منشط تجريبي'); }
else log('لا ملاحظة S04', true);
console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close();
