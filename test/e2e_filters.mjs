// فلاتر جدول المستفيدين وحقل «أخرى» لنوع الإعاقة (خادم على 8765)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const log=(...a)=>console.log(...a); const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs=[];
pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demo]'); await pg.waitForTimeout(800);
await pg.click('a[data-go=bnf]'); await pg.waitForTimeout(300);
const n=()=>pg.locator('#bnres tr').count();
const all=await n(); await pg.selectOption('#bf-sex','F'); const f=await n(); await pg.selectOption('#bf-dis','1'); const d=await n();
log('all',all-1,'F',f-1,'F+dis',d-1, await pg.textContent('#bnres p'));
await pg.click('[data-act=bfReset]'); log('reset', (await n())-1);
// أخرى
await pg.fill('#bn','محمد أحمد علي سالم'); await pg.selectOption('#bdis','1'); log('hidden before', await pg.isVisible('#bdow'));
await pg.selectOption('#bdt','أخرى'); log('visible after', await pg.isVisible('#bdow'));
await pg.click('[data-act=bSave]'); log('toast', await pg.textContent('#toast'));
await pg.fill('#bdo','متلازمة داون'); await pg.click('[data-act=bSave]'); await pg.waitForTimeout(400);
log(await pg.evaluate(()=>{const x=window.__nawa.db.beneficiaries.at(-1);return [x.name,x.disabilityType,x.disabilityOther].join('|')}));
await pg.fill('#bq','محمد أحمد علي سالم'); await pg.waitForTimeout(400); log((await pg.textContent('#bnres')).includes('أخرى: متلازمة داون'));
log(errs); await b.close();
