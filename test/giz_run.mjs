import fs from 'node:fs'; import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { giz } from '../app/giz.js'; import { validateEntry, reconcile } from '../core/validate.js'; import { validateSheet, derivedCounts } from '../core/sheets.js'; import { exportPTT } from '../core/ptt-export.js'; import { dashboard } from '../core/aggregate.js';
const db = giz(), p = db.projects[0]; console.log('sheets', db.sheets.length, 'sessions', db.sessions.length, 'bnf', db.beneficiaries.length, 'ops', db.ops.length, 'responses', db.surveyResponses.length);
let bad = 0; for (const s of db.sheets) { const r = validateSheet(s, db, { others: db.sessions.filter((x) => x.sheetId !== s.id) }); if (r.errors.length || r.warnings.length) { bad++; console.log(' ', s.kind, s.meta.title || s.meta.type, 'E:', r.errors, 'W:', r.warnings); } }
console.log('sheet problems:', bad);
const c = {}; for (const x of [...validateEntry(db), ...reconcile(db)]) { const k = x.level + ' ' + x.code; (c[k] ||= []).push(x.msg); } for (const [k, v] of Object.entries(c)) console.log(k, v.length, '|', v[0]);
const d = dashboard(p, db); console.log('dash: attendance', d.attendance, 'direct', d.directCount, 'unique', d.uniqueRolled);
const r = await exportPTT(fs.readFileSync('assets/ptt.xlsx'), p, db, DOMParser, XMLSerializer); console.log('warnings:'); r.warnings.forEach((w) => console.log(' -', w)); fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/GIZ_PTT.xlsx', Buffer.from(r.data));
