import fs from 'node:fs'; import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { newDb } from '../core/model.js'; import { demo } from '../app/demo.js'; import { france } from '../app/sim_france.js';
import { validateEntry, reconcile } from '../core/validate.js'; import { exportPTT } from '../core/ptt-export.js';
for (const [n, mk] of [['demo', () => { const d = newDb(); demo(d); return d; }], ['france', france]]) {
  const db = mk(), p = db.projects[0]; console.log('=====', n, 'sessions', db.sessions.length, 'bnf', db.beneficiaries.length);
  const c = {}; for (const x of [...validateEntry(db), ...reconcile(db)]) { const k = x.level + ' ' + x.code; (c[k] ||= []).push(x.msg || x.message); }
  for (const [k, v] of Object.entries(c)) console.log(k, v.length, '|', v[0]);
  const r = await exportPTT(fs.readFileSync('assets/ptt.xlsx'), p, db, DOMParser, XMLSerializer); console.log('warnings:'); r.warnings.forEach((w) => console.log(' -', w));
}
