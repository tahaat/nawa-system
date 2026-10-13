// يولّد PDF لكل نوع كشف من الكشوف التجريبية (GIZ) إلى /tmp/demo_pdfs (خادم على 8765)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
pg.on('pageerror', (e) => console.log('ERR', e.message));
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(400);
await pg.evaluate(() => localStorage.setItem('nawa.pgsize', '100'));
await pg.reload(); await pg.waitForSelector('#nav'); await pg.click('a[data-go=sheets]'); await pg.waitForTimeout(500);
const rows = await pg.$$eval('#view table tr', (trs) => trs.map((tr) => ({ kind: tr.children[0]?.textContent.trim(), title: tr.children[1]?.textContent.trim(), id: tr.querySelector('[data-shact=pdf]')?.dataset.id })).filter((r) => r.id));
console.log(rows.length, 'كشف');
fs.mkdirSync('/tmp/demo_pdfs', { recursive: true }); const seen = new Set();
for (const r of rows) {
  if (seen.has(r.kind)) continue; seen.add(r.kind);
  await pg.evaluate((id) => document.querySelector(`[data-shact=pdf][data-id="${id}"]`).click(), r.id); await pg.waitForTimeout(1500);
  const html = await pg.evaluate(() => [...document.querySelectorAll('body > iframe')].pop().contentDocument.documentElement.outerHTML);
  const name = r.kind.replace(/[\\/:*?"<>|()\s]+/g, '_'); const pp = await b.newPage(); await pp.setContent(html); await pp.pdf({ path: `/tmp/demo_pdfs/${name}.pdf`, preferCSSPageSize: true, printBackground: true }); await pp.close(); console.log('✔', r.kind, '|', r.title);
}
await b.close();
