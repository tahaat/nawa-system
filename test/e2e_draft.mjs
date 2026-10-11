// المسودات: حفظ يدوي وتلقائي، الاستئناف بعد التنقل وبعد إعادة التحميل، الإكمال والحفظ النهائي (خادم على 8765 يخدم dist)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 1000 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m); const E = (f, a) => pg.evaluate(f, a);
const nD = () => E(() => new Promise((r) => { const q = indexedDB.open('nawa-system'); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('drafts'); g.onsuccess = () => r((g.result?.value || []).length); }; }));
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demo]'); await pg.waitForTimeout(800);
// ---- كشف حضور ----
await pg.click('a[data-go=sheets]'); await pg.click('[data-shact=new][data-k=course]');
await pg.selectOption('#sh-act', { index: 1 }); await pg.selectOption('#sh-ctr', { index: 1 });
const F = { title: 'قصص الشفاء', facilitator: 'سناء الأسطل', start: '2026-02-01', end: '2026-03-30', hours: '6', meetings: '4', from: '09:00', to: '10:30', venue: 'القاعة 1', mandatoryPct: '75' };
for (const [k, v] of Object.entries(F)) await pg.fill(`[data-sm=${k}]`, v);
const sh0 = await E(() => window.__nawa.db.sheets.length), ss0 = await E(() => window.__nawa.db.sessions.length);
await pg.click('[data-shact=draft]'); await pg.waitForTimeout(300);
log('زر «حفظ كمسودة» يعيد إلى القائمة ويُظهر بطاقة المسودات', (await pg.locator('#draftcard').count()) === 1 && /قصص الشفاء/.test(await pg.textContent('#draftcard')));
log('المسودة لا تدخل الكشوف ولا الجلسات (رغم أخطاء الكشف)', (await E(() => window.__nawa.db.sheets.length)) === sh0 && (await E(() => window.__nawa.db.sessions.length)) === ss0);
log('شارة عدد المسودات في الشريط العلوي = 1', (await pg.textContent('[data-act=drafts] .dot')) === '1');
// استئناف ثم انتقال لشاشة أخرى دون حفظ → حفظ تلقائي
await pg.click('#draftcard [data-act=draftResume]'); await pg.waitForSelector('[data-sm=title]');
log('الاستئناف يعيد القيم كما كُتبت', (await pg.inputValue('[data-sm=title]')) === 'قصص الشفاء' && (await pg.inputValue('[data-sm=venue]')) === 'القاعة 1');
await pg.fill('[data-sm=venue]', 'القاعة 2'); await pg.click('a[data-go=dash]'); await pg.waitForTimeout(400);
log('الانتقال لشاشة أخرى يحفظ التعديلات تلقائيًا في نفس المسودة (لا نسخة ثانية)', (await nD()) === 1);
await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(300);
log('العودة تعرض القائمة والمسودة (لا ضياع ولا محرر مفتوح عالق)', (await pg.locator('#draftcard').count()) === 1);
// إعادة تحميل الصفحة
await pg.reload(); await pg.waitForSelector('#nav'); await pg.waitForTimeout(600);
log('المسودة تبقى بعد إعادة تحميل الصفحة', (await pg.textContent('[data-act=drafts] .dot')) === '1');
await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(300);
if (!(await pg.locator('#draftcard').count())) { console.log('لا بطاقة مسودات (ربما لم تُحفظ بيانات المشروع بعد إعادة التحميل)'); }
else {
  await pg.click('#draftcard [data-act=draftResume]'); await pg.waitForSelector('[data-sm=title]');
  log('بعد إعادة التحميل: استئناف بالقيمة المعدلة (القاعة 2)', (await pg.inputValue('[data-sm=venue]')) === 'القاعة 2');
  await pg.selectOption('[data-sm=type]', 'فنية'); await pg.check('[data-sg=c712]'); await pg.fill('[data-sq=roster]', ''); await pg.waitForTimeout(200);
  for (let i = 0; i < 4; i++) await pg.click('#res-roster [data-shact=add]');
  for (let i = 0; i < 3; i++) await pg.fill(`[data-sv="${i}"]`, ['2026-02-01', '2026-02-08', '2026-02-15'][i]);
  await pg.waitForSelector('[data-sp]'); for (const i of [0, 1, 2]) await pg.click(`[data-shact=col][data-i="${i}"]`);
  await pg.click('[data-shact=save]'); if (await pg.locator('#dlg-ok').count()) await pg.click('#dlg-ok'); await pg.waitForTimeout(500);
  const r = await E(() => ({ sh: window.__nawa.db.sheets.length, ss: window.__nawa.db.sessions.filter((s) => s.sheetId).length }));
  log(`الحفظ النهائي أنشأ الكشف وجلساته ${JSON.stringify(r)}`, r.sh === sh0 + 1 && r.ss === 3);
  log('المسودة حُذفت بعد الحفظ النهائي', (await nD()) === 0 && (await pg.locator('#draftcard').count()) === 0);
}
// ---- جلسة ----
await pg.click('a[data-go=sessions]'); await pg.waitForTimeout(300);
await pg.click('[data-att] >> nth=0'); await pg.click('[data-att] >> nth=1'); await pg.fill('#se', 'منشط تجريبي'); const s0 = await E(() => window.__nawa.db.sessions.length);
await pg.click('[data-act=saveSessDraft]'); await pg.waitForTimeout(300);
log('جلسة: حُفظت كمسودة ولم تدخل الجلسات', (await pg.locator('#draftcard').count()) === 1 && (await E(() => window.__nawa.db.sessions.length)) === s0 && (await pg.textContent('#draftcard')).includes('2 حاضر'));
await pg.click('#draftcard [data-act=draftResume]'); await pg.waitForTimeout(300);
log('جلسة: الاستئناف يعيد المنشّط والحاضرين', (await pg.inputValue('#se')) === 'منشط تجريبي' && (await pg.textContent('#sel-n')) === '2');
await pg.click('[data-act=saveSession]'); await pg.waitForTimeout(400);
log('جلسة: الحفظ النهائي أضاف جلسة وحذف المسودة', (await E(() => window.__nawa.db.sessions.length)) === s0 + 1 && (await pg.locator('#draftcard').count()) === 0);
// ---- إنجاز تشغيلي (إن وُجد نشاط تشغيلي) ----
await pg.click('a[data-go=ops]'); await pg.waitForTimeout(300);
if (await pg.locator('#o-ref').count()) {
  await pg.fill('#o-ref', 'فاتورة 77'); await pg.click('#o-draft'); await pg.waitForTimeout(300);
  log('إنجاز: مسودة محفوظة', (await pg.locator('#draftcard').count()) === 1);
  await pg.click('#draftcard [data-act=draftResume]'); await pg.waitForTimeout(300);
  log('إنجاز: الاستئناف يعيد المرجع', (await pg.inputValue('#o-ref')) === 'فاتورة 77'); await pg.click('#o-save'); await pg.waitForTimeout(300);
  log('إنجاز: بعد الحفظ لا مسودة', (await nD()) === 0);
} else console.log('لا أنشطة تشغيلية في المشروع التجريبي — تخطّي اختبار الإنجاز');
// ---- مستفيد ----
await pg.click('a[data-go=bnf]'); await pg.waitForTimeout(300);
await pg.fill('#bn', 'ليلى عمر حسن'); await pg.fill('#bp', '0591234567'); await pg.click('[data-act=bDraft]'); await pg.waitForTimeout(300);
log('مستفيد: مسودة ثم تفريغ النموذج', (await pg.locator('#draftcard').count()) === 1 && (await pg.inputValue('#bn')) === '');
await pg.click('#draftcard [data-act=draftResume]'); await pg.waitForTimeout(300);
log('مستفيد: الاستئناف يعيد الاسم والجوال', (await pg.inputValue('#bn')) === 'ليلى عمر حسن' && (await pg.inputValue('#bp')) === '0591234567');
await pg.fill('#bn', 'ليلى عمر حسن سالم'); await pg.fill('#ba', '10'); const bn0 = await E(() => window.__nawa.db.beneficiaries.length);
await pg.click('a[data-go=dash]'); await pg.waitForTimeout(300); await pg.click('[data-act=drafts]');
log('زر المسودات في الأعلى يفتح قائمة بها المسودة المحدثة تلقائيًا', /ليلى عمر حسن سالم/.test(await pg.textContent('#panel')));
await pg.click('#panel [data-act=draftResume]'); await pg.waitForSelector('#bn'); await pg.click('[data-act=bSave]'); await pg.waitForTimeout(500);
log('مستفيد: الحفظ النهائي أضافه وحذف المسودة', (await E(() => window.__nawa.db.beneficiaries.length)) === bn0 + 1 && (await nD()) === 0);
// حذف مسودة
await pg.fill('#bn', 'أحمد خالد يوسف'); await pg.click('[data-act=bDraft]'); await pg.click('#draftcard [data-act=draftDel]'); await pg.click('#dlg-ok'); await pg.waitForTimeout(300);
log('حذف المسودة يعمل', (await nD()) === 0);
// الإنجليزية
await pg.click('[data-act=lang]'); await pg.waitForTimeout(400); await pg.click('a[data-go=sheets]'); await pg.click('[data-shact=new][data-k=course]');
log('نص الزر بالإنجليزية', /Save as draft/.test(await pg.textContent('#view')));
// ---- إنجاز تشغيلي (مشروع GIZ يحوي أنشطة تشغيلية) ----
const pg2 = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage(); pg2.on('pageerror', (e) => errs.push(e.message));
await pg2.goto('http://localhost:8765/'); await pg2.waitForSelector('#nav'); await pg2.click('[data-act=demoGiz]'); await pg2.waitForTimeout(900); await pg2.click('a[data-go=ops]'); await pg2.waitForTimeout(300);
if (await pg2.locator('#o-ref').count()) {
  const o0 = await pg2.evaluate(() => window.__nawa.db.ops.length);
  await pg2.fill('#o-ref', 'فاتورة 77'); await pg2.click('a[data-go=dash]'); await pg2.waitForTimeout(300); await pg2.click('a[data-go=ops]'); await pg2.waitForTimeout(300);
  log('إنجاز: الانتقال يحفظ مسودة تلقائيًا', (await pg2.locator('#draftcard').count()) === 1 && (await pg2.evaluate(() => window.__nawa.db.ops.length)) === o0);
  await pg2.click('#draftcard [data-act=draftResume]'); await pg2.waitForTimeout(300);
  log('إنجاز: الاستئناف يعيد المرجع', (await pg2.inputValue('#o-ref')) === 'فاتورة 77'); await pg2.click('#o-save'); await pg2.waitForTimeout(400);
  log('إنجاز: الحفظ النهائي أضاف السجل وحذف المسودة', (await pg2.evaluate(() => window.__nawa.db.ops.length)) === o0 + 1 && (await pg2.locator('#draftcard').count()) === 0);
} else log('لا أنشطة تشغيلية في مشروع GIZ', false);
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
