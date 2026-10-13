// تصدير كشف الحضور إلى PDF طبق الأصل (خادم على 8765): يبني كشفًا من كل نوع ويطبع PDF عبر Chromium
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 1000 } }); const errs = [];
pg.on('pageerror', (e) => errs.push(e.message)); const log = (m, ok) => console.log(ok ? 'ok  ' : 'FAIL', m);
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(300);
fs.mkdirSync('/tmp/pdfout', { recursive: true });
const kinds = ['course', 'edu', 'parents', 'activity', 'openday', 'trip', 'visit', 'joint'];
for (const k of kinds) {
  await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(700); await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(200);
  await pg.click(`[data-shact=new][data-k=${k}]`); await pg.waitForTimeout(200);
  // تعبئة الحقول
  await pg.evaluate(() => {
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    document.querySelectorAll('[data-sm]').forEach((el) => { const k = el.dataset.sm; if (el.tagName === 'SELECT') { if (k === 'mode') set(el, 'inperson'); else if (el.options.length > 1) set(el, el.options[1].value); } else if (el.type === 'date') set(el, k === 'end' ? '2026-04-10' : '2026-03-10'); else if (el.type === 'time') set(el, k === 'to' ? '11:30' : '09:00'); else if (el.type === 'number') set(el, '12'); else if (el.tagName === 'TEXTAREA') set(el, 'نشاط أول\nنشاط ثانٍ\nنشاط ثالث'); else set(el, k === 'venue' ? 'قاعة الفنون' : 'قيمة ' + k); });
    document.querySelectorAll('[data-sg]').forEach((el) => { if (!el.checked) el.click(); });
  });
  await pg.waitForTimeout(300);
  for (const l of ['roster', 'rosterP']) { const pa = await pg.$(`[data-shact=pickAll][data-l=${l}]`); if (!pa) continue; await pa.click(); await pg.waitForTimeout(150); await pg.click(`[data-shact=pickAdd][data-l=${l}]`).catch(() => {}); await pg.waitForTimeout(200); }
  const nPpl = await pg.evaluate(() => document.querySelectorAll('#sh-lists .tw:not(.ptab) tbody tr, #sh-lists .tw:not(.ptab) table tr').length); console.log('  صفوف المشاركين في المحرر:', nPpl);
  await pg.waitForTimeout(300);
  await pg.evaluate(() => document.querySelector('[data-shact=pdf]').click()); await pg.waitForTimeout(1200);
  const out = await pg.evaluate(() => { const f = [...document.querySelectorAll('body > iframe')].pop(); return f ? f.contentDocument.documentElement.outerHTML : null; });
  if (!out) { log(k + ': لم يُنتج HTML', false); continue; }
  fs.writeFileSync(`/tmp/pdfout/${k}.html`, out); log(k + ': HTML ' + out.length, out.length > 5000);
  const plain = out.replace(/<[^>]+>/g, ' ');
  log(k + ': اسم المشروع مملوء', /اسم المشروع:\s*\S+/.test(plain)); log(k + ': الشعار والهيدر والفوتر', out.includes('data:image/png') && plain.includes('NCAA-M&amp;E') && plain.includes('توقيع'));
  log(k + ': لا بقايا قالب {{LOGO}}', !out.includes('{{LOGO'));
  if (k === 'activity') { log('activity: عنوان النشاط وتاريخه', plain.includes('قيمة title') && plain.includes('10/03/2026')); log('activity: الوقت', /من الساعة:\s*09:00/.test(plain) && /حتى الساعة:\s*11:30/.test(plain)); log('activity: علامة وجاهي', /\(\s*✓\s*\)\s*وجاهي/.test(plain.replace(/\s+/g, ' '))); log('activity: عدد صفوف المشاركين ≥ 20', (out.match(/<tr/g) || []).length > 30); }
  const pp = await b.newPage(); await pp.setContent(out); await pp.pdf({ path: `/tmp/pdfout/${k}.pdf`, preferCSSPageSize: true, printBackground: true }); await pp.close();
}
console.log(errs.length ? 'أخطاء الصفحة: ' + errs.join(' | ') : 'أخطاء الصفحة: لا شيء'); await b.close();
