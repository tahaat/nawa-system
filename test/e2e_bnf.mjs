// المستفيدون: توهج لحظي، نوع إعاقة مشروط، تحقق الهاتف، تعديل، مرفقات (ملف/رابط)، استيراد بقالب
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import ExcelJS from '/home/claude/nawa-system/node_modules/exceljs/lib/exceljs.nodejs.js';
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }), pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=newProject]'); await pg.waitForTimeout(300); await pg.click('a[data-go=bnf]'); await pg.waitForTimeout(400);
const cls = (s) => pg.$eval(s, (e) => e.className);
log('الاسم فارغ بلا توهج', !/fld/.test(await cls('#bn')));
await pg.fill('#bn', 'محمد أحمد'); log('اسم منقوص: توهج أحمر + رسالة', /fld-bad/.test(await cls('#bn')) && /منقوص/.test(await pg.locator('#bn + .fh').innerText()));
await pg.fill('#bn', 'محمد أحمد علي سالم'); log('اسم مكتمل: توهج أخضر', /fld-ok/.test(await cls('#bn')));
log('نوع الإعاقة مخفي فعليًا (غير مرئي)', !(await pg.isVisible('#bdtw'))); await pg.selectOption('#bdis', '1'); log('نوع الإعاقة يظهر عند «نعم» بقائمة', (await pg.isVisible('#bdtw')) && (await pg.locator('#bdt option').count()) > 4);
await pg.fill('#bp', '0585123456'); log('جوال خاطئ: أحمر', /fld-bad/.test(await cls('#bp'))); await pg.fill('#bp', '٠٥٩٥١٢٣٤٥٦'); log('جوال صحيح بأرقام عربية: أخضر', /fld-ok/.test(await cls('#bp')));
await pg.click('details summary'); await pg.fill('#bem', 'abc@'); log('بريد خاطئ أحمر', /fld-bad/.test(await cls('#bem'))); await pg.fill('#bem', 'Taha@Example.com');
await pg.fill('#bnid', '12345'); log('هوية خاطئة أحمر', /fld-bad/.test(await cls('#bnid'))); await pg.fill('#bnid', '000000018');
// حفظ بلا نوع إعاقة يُرفض
await pg.click('[data-act=bSave]'); await pg.waitForTimeout(300); log('يرفض الحفظ بلا نوع الإعاقة', (await pg.evaluate(() => window.__nawa.db.beneficiaries.length)) === 0);
await pg.selectOption('#bdt', { index: 2 }); await pg.fill('#bep', '0561234567'); await pg.fill('#ben', 'الأب');
// مرفقات: رابط وملف
await pg.selectOption('#at-kind', 'link'); await pg.fill('#at-url', 'javascript:alert(1)'); await pg.click('[data-act=bAttAdd]'); await pg.waitForTimeout(200); log('يرفض رابطًا غير آمن', (await pg.locator('#batt tr').count()) === 0);
await pg.fill('#at-url', 'https://drive.google.com/file/d/abc'); await pg.fill('#at-title', 'هوية'); await pg.click('[data-act=bAttAdd]');
await pg.selectOption('#at-kind', 'file'); fs.writeFileSync('/tmp/doc.pdf', '%PDF-1.4 test'); await pg.setInputFiles('#at-file', '/tmp/doc.pdf'); await pg.selectOption('#at-type', 'cert'); await pg.click('[data-act=bAttAdd]'); await pg.waitForTimeout(300);
log('مرفقان في القائمة', (await pg.locator('#batt tr').count()) === 3);
await pg.click('[data-act=bSave]'); await pg.waitForTimeout(500);
const rec = await pg.evaluate(() => window.__nawa.db.beneficiaries[0]); console.log(JSON.stringify({ ...rec, attachments: rec.attachments?.length }));
log('حُفظ بالقيم المنظّفة', rec.phone === '0595123456' && rec.email === 'taha@example.com' && rec.nationalId === '000000018' && rec.disabilityType && rec.attachments.length === 2);
// تعديل
await pg.click('[data-act=bEdit]'); await pg.waitForTimeout(400); log('نموذج التعديل معبأ', (await pg.inputValue('#bn')) === 'محمد أحمد علي سالم' && /fld-ok/.test(await cls('#bn')) && (await pg.locator('#batt tr').count()) === 3);
await pg.fill('#bn', 'محمد أحمد علي سالم الأسطل'); await pg.fill('#ba', '14'); await pg.click('[data-act=bAttDel] >> nth=1'); await pg.click('[data-act=bSave]'); await pg.waitForTimeout(500);
const r2 = await pg.evaluate(() => ({ n: window.__nawa.db.beneficiaries.length, b: window.__nawa.db.beneficiaries[0] })); log('التعديل حدّث السجل نفسه وحذف مرفقًا', r2.n === 1 && r2.b.name.endsWith('الأسطل') && r2.b.age === 14 && r2.b.attachments.length === 1);
// فتح ملف من القاعدة
await pg.click('[data-act=bEdit]'); await pg.waitForTimeout(300); await pg.click('[data-act=bAttAdd]').catch(() => {});
// استيراد
const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('x'); ws.addRow(['الاسم', 'الجنس', 'العمر', 'الإعاقة', 'نوع الإعاقة', 'الجوال', 'الهوية', 'البريد', 'هاتف الطوارئ']);
ws.addRow(['سلمى خالد محمود عطية', 'أنثى', 10, 'نعم', 'حركية', '0561112233', '123', 'x@y.com', '0591112233']); ws.addRow(['علي عمر', 'ذكر', 9, 'لا', '', '12345', '', 'bad', '']); ws.addRow(['بلا جنس واضح', '', 5]);
await wb.xlsx.writeFile('/tmp/imp.xlsx'); await pg.click('[data-act=bCancel]').catch(() => {}); await pg.waitForTimeout(300); await pg.setInputFiles('#bimp', '/tmp/imp.xlsx'); await pg.click('[data-act=bImp]'); await pg.waitForTimeout(800);
const msg = await pg.locator('#bimsg').innerText(); console.log(msg); const all = await pg.evaluate(() => window.__nawa.db.beneficiaries.map((x) => [x.name, x.phone, x.nationalId, x.email, x.emergencyPhone, x.disabilityType]));
log('استيراد بالتنظيف (3 مستفيدين، تجاهل القيم الخاطئة)', all.length === 3 && !all[2][1] && !all[1][2] && !all[2][3] && all[1][4] === '0591112233' && /منقوص/.test(msg));
const [d] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=bTpl]')]); await d.saveAs('/tmp/tpl.xlsx'); log('قالب الاستيراد', fs.statSync('/tmp/tpl.xlsx').size > 3000);
await pg.click('[data-act=lang]'); await pg.waitForTimeout(500); await pg.click('a[data-go=bnf]'); await pg.waitForTimeout(400); const t = await pg.locator('#view').innerText(); log('الشاشة بالإنجليزية', /Add beneficiary|Edit beneficiary/.test(t) && /Attachments/.test(t));
console.log('أخطاء:', errs.length ? errs : 'لا شيء'); await b.close();
