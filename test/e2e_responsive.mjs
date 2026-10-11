import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const sizes = [[360, 740], [412, 915], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];
const routes = ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'projects', 'plan', 'centers', 'check', 'surveys', 'cloud', 'export', 'gloss', 'settings'];
for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }), pg = await ctx.newPage();
  await pg.goto('http://localhost:8765/'); await pg.waitForSelector('#nav'); await pg.click('[data-act=demoGiz]'); await pg.waitForTimeout(900);
  const bad = [];
  for (const r of routes) {
    await pg.evaluate((r) => window.__nawa.go(r), r); await pg.waitForTimeout(450);
    const m = await pg.evaluate(() => { const de = document.documentElement, vw = de.clientWidth; const over = de.scrollWidth - vw; const wide = []; for (const e of document.querySelectorAll('#view *, #top *')) { const r = e.getBoundingClientRect(); if (r.width > 0 && (r.right > vw + 2 || r.left < -2) && !e.closest('.tw,table,.card[style],pre') ) { wide.push((e.tagName + '.' + (e.className || '')).slice(0, 40)); if (wide.length > 3) break; } } const side = document.querySelector('#side')?.getBoundingClientRect(); return { over, wide, side: side ? Math.round(side.width) : null, vw }; });
    if (m.over > 2 || m.wide.length) bad.push(`${r}: +${m.over}px ${m.wide.join(',')}`);
    if (['dash', 'sheets', 'projects', 'plan', 'settings'].includes(r)) await pg.screenshot({ path: `/tmp/r_${w}_${r}.png` });
  }
  console.log(`${w}x${h}`, bad.length ? bad : 'OK'); await ctx.close();
}
await b.close();
