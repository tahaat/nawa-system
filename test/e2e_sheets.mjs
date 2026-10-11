// اختبار واجهة كشوفات الحضور في متصفح حقيقي (يتطلب خادماً على 8765 يخدم dist)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.env.URL || 'http://localhost:8765/'; const shots = process.env.SHOTS || '/tmp';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 1000 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(url); await pg.waitForSelector('#nav');
await pg.click('[data-act=demo]'); await pg.waitForTimeout(800);
await pg.click('a[data-go=sheets]'); await pg.click('[data-shact=new][data-k=course]');
const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m); const num = async (sel) => (await pg.$$(sel)).length;
const checkTxt = async () => (await pg.textContent('#sh-check'));
let t = await checkTxt(); log('كشف فارغ: أخطاء ظاهرة وزر الحفظ معطّل', /خطأ/.test(t) && (await pg.isDisabled('[data-shact=save]')));
await pg.selectOption('#sh-act', { index: 1 }); await pg.selectOption('#sh-ctr', { index: 1 });
const F = { title: 'قصص الشفاء', facilitator: 'سناء الأسطل', start: '2026-02-01', end: '2026-03-30', hours: '6', meetings: '4', from: '09:00', to: '10:30', venue: 'القاعة 1', mandatoryPct: '75' };
for (const [k, v] of Object.entries(F)) await pg.fill(`[data-sm=${k}]`, v);
await pg.selectOption('[data-sm=type]', 'فنية'); await pg.check('[data-sg=c712]');
await pg.fill('[data-sq=roster]', ''); await pg.waitForTimeout(200);
log('نتائج البحث تُظهر المطابقين للفئة فقط', (await num('#res-roster [data-shact=add]')) > 5);
for (let i = 0; i < 4; i++) { await pg.click('#res-roster [data-shact=add]'); }
log('أُضيف 4 مشاركين', (await num('[data-sp], tr td button[data-shact=rm]')) >= 4);
for (let i = 0; i < 3; i++) await pg.fill(`[data-sv="${i}"]`, ['2026-02-01', '2026-02-08', '2026-02-15'][i]);
await pg.waitForSelector('[data-sp]');
t = await checkTxt(); log('اللقاء بلا حاضر يُرفض', /بلا أي حاضر/.test(t));
for (const i of [0, 1, 2]) await pg.click(`[data-shact=col][data-i="${i}"]`);
await pg.uncheck('[data-sp^="2|"] >> nth=0'); t = await checkTxt();
log('بعد تسجيل الحضور لا أخطاء', !/>خطأ</.test(await pg.innerHTML('#sh-check')) && !/لا يمكن الحفظ/.test(t));
log('الأعداد مشتقة تلقائياً (الإجمالي 4)', /الإجمالي\s*4/.test(t));
log('مستوفون لنسبة الحضور معروضون', /مستوفون/.test(t));
await pg.screenshot({ path: `${shots}/sheet_course.png`, fullPage: true });
// خطأ العمر: أضف مستفيداً جديداً بعمر خارج الفئة
await pg.click('[data-shact=quick][data-l=roster]'); await pg.fill('#qa-name', 'خالد سامي رامي حمدان'); await pg.selectOption('#qa-sex', 'M'); await pg.fill('#qa-age', '15'); await pg.click('[data-shact=quickSave]');
log('الإضافة السريعة تمنع عمراً خارج الفئة', /خارج الفئات المختارة/.test(await pg.textContent('#qa-err')));
await pg.fill('#qa-age', '9'); await pg.fill('#qa-name', 'خالد'); await pg.click('[data-shact=quickSave]'); log('الإضافة السريعة تمنع الاسم القصير', /ثلاثة مقاطع/.test(await pg.textContent('#qa-err')));
await pg.fill('#qa-name', 'خالد سامي رامي حمدان'); await pg.click('[data-shact=quickSave]'); await pg.waitForTimeout(200);
log('مشارك جديد أُضيف للسجل والكشف', (await pg.evaluate(() => window.__nawa.db.beneficiaries.some((x) => x.name === 'خالد سامي رامي حمدان'))));
await pg.click('[data-shact=save]'); await pg.waitForSelector('#dlg-ok'); log('التنبيه يطلب تأكيداً قبل الحفظ', /بلا أي حضور/.test(await pg.textContent('.dlg p'))); await pg.click('#dlg-ok'); await pg.waitForTimeout(400);
const r = await pg.evaluate(() => ({ sh: window.__nawa.db.sheets.length, ss: window.__nawa.db.sessions.filter((s) => s.sheetId).length, att: window.__nawa.db.sessions.filter((s) => s.sheetId).map((s) => s.attendance.length) }));
log(`حُفظ الكشف وولّد جلسات: ${JSON.stringify(r)}`, r.sh === 1 && r.ss === 3);
await pg.click('a[data-go=check]'); await pg.waitForTimeout(300); const errsX = await pg.$$eval('#view .badge.b-error', (e) => e.length); log(`فحص التكامل والإدخال: ${errsX} أخطاء`, errsX === 0);
await pg.click('a[data-go=sheets]'); await pg.screenshot({ path: `${shots}/sheet_list.png`, fullPage: true });
// زيارة بزوار مضمَّنين
await pg.click('[data-shact=new][data-k=visit]'); await pg.click('[data-shact=quick][data-l=guests]'); await pg.fill('#qa-name', 'زائر أول ثالث رابع'); await pg.selectOption('#qa-sex', 'M'); await pg.fill('#qa-age', '8'); await pg.click('[data-shact=quickSave]');
log('الزائر المضمَّن أُضيف', (await num('table td button[data-shact=rm]')) === 1);
console.log('أخطاء الصفحة:', errs.length ? errs : 'لا شيء'); await b.close();
