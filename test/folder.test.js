import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createFolderSync, newFolderMeta } from '../core/sync-folder.js'; import { newDb } from '../core/model.js'; import { tiny } from './fixture.js'; import { reconcile } from '../core/validate.js';

// مجلد جهاز على القرص: القنوات = المجلدات الفرعية الموجودة فقط (كما يصل عبر OneDrive حسب المشاركة)
export function fsDir(root) {
  return {
    async channels() { return fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []; },
    async ensure(ch) { fs.mkdirSync(path.join(root, ch), { recursive: true }); },
    async list(ch) { return fs.readdirSync(path.join(root, ch)).map((n) => { const s = fs.statSync(path.join(root, ch, n)); return { name: n, mtime: s.mtimeMs, size: s.size }; }); },
    async read(ch, n) { return fs.readFileSync(path.join(root, ch, n), 'utf8'); },
    async write(ch, n, t) { fs.writeFileSync(path.join(root, ch, n), t); fs.utimesSync(path.join(root, ch, n), new Date(), new Date()); },
  };
}
// يحاكي OneDrive: ينسخ ملفات كل جهاز إلى الأجهزة الأخرى بشرط وجود مجلد القناة عندها
function onedrive(roots) { for (const a of roots) for (const ch of fs.readdirSync(a)) for (const f of fs.readdirSync(path.join(a, ch))) for (const b of roots) { if (b === a || !fs.existsSync(path.join(b, ch))) continue; const dst = path.join(b, ch, f); fs.copyFileSync(path.join(a, ch, f), dst); } }
const mkRoot = (chs) => { const r = fs.mkdtempSync(path.join(os.tmpdir(), 'nawa-')); for (const c of chs) fs.mkdirSync(path.join(r, c)); return r; };
const mk = (root, db = newDb(), tick) => { const meta = newFolderMeta(); return { root, db, meta, s: createFolderSync({ db, meta, dir: fsDir(root), now: tick }) }; };

test('مزامنة OneDrive: مدير بكل القنوات ومنسق بقناتين فقط', async () => {
  let t = 1000; const tick = () => (t += 10);
  const rA = mkRoot(['core', 'pii', 'c-c1', 'c-c2']), rB = mkRoot(['core', 'c-c1']);
  const A = mk(rA, newDb(), tick), B = mk(rB, newDb(), tick);
  Object.assign(A.db, tiny()); A.db.beneficiaries[0].phone = '0599111222'; A.db.beneficiaries[2].disabilityType = 'حركية';
  let r = await A.s.sync(); assert.ok(r.wrote >= 3, JSON.stringify(r));
  onedrive([rA, rB]); await B.s.sync();
  assert.deepEqual(B.db.sessions.map((s) => s.id).sort(), ['s1', 's2', 's4', 's5', 's6']);          // لا جلسات c2
  assert.ok(B.db.beneficiaries.every((b) => !('phone' in b) && !('disabilityType' in b)));            // لا حقول حساسة
  assert.equal(B.db.beneficiaries.length, 5); assert.equal(B.db.projects.length, 1);
  // المنسق يعدّل اسمًا ويضيف جلسة في مركزه ثم جلسة في مركز لا يملكه
  B.db.beneficiaries[0].name = 'اسم من المنسقة';
  B.db.sessions.push({ id: 'ok1', projectId: 'p1', activityId: 'a1', centerId: 'c1', date: '2026-06-01', educator: 'x', mode: 'counts', counts: { M: 1, F: 1, MWD: 0, FWD: 0 } });
  B.db.sessions.push({ id: 'nope', projectId: 'p1', activityId: 'a1', centerId: 'c2', date: '2026-06-02', educator: 'x', mode: 'counts', counts: { M: 1, F: 1, MWD: 0, FWD: 0 } });
  r = await B.s.sync(); assert.ok(r.errors.some((e) => e.includes('c-c2')), JSON.stringify(r.errors)); assert.ok(B.s.pending() >= 1);
  onedrive([rA, rB]); await A.s.sync();
  assert.equal(A.db.beneficiaries[0].name, 'اسم من المنسقة'); assert.equal(A.db.beneficiaries[0].phone, '0599111222');   // الهاتف محفوظ
  assert.ok(A.db.sessions.find((s) => s.id === 'ok1')); assert.ok(!A.db.sessions.find((s) => s.id === 'nope'));
  assert.equal(A.db.beneficiaries[2].disabilityType, 'حركية');
  // حذف من المدير يصل المنسق
  A.db.sessions = A.db.sessions.filter((s) => s.id !== 's1' && s.id !== 's3'); await A.s.sync(); onedrive([rA, rB]); await B.s.sync();
  assert.ok(!B.db.sessions.find((s) => s.id === 's1'));
  assert.deepEqual(reconcile(A.db).filter((x) => x.level === 'error'), []);
});
test('تعارض: الأحدث يفوز، وإعادة التزامن لا تُحدث تغييرات', async () => {
  let t = 5000; const tick = () => (t += 10); const rA = mkRoot(['core']), rB = mkRoot(['core']); const A = mk(rA, newDb(), tick), B = mk(rB, newDb(), tick);
  A.db.centers.push({ id: 'k', name: 'أصل' }); await A.s.sync(); onedrive([rA, rB]); await B.s.sync();
  A.db.centers[0].name = 'من A'; await A.s.sync(); B.db.centers[0].name = 'من B'; await B.s.sync();   // B لاحقًا ⇒ الأحدث
  onedrive([rA, rB]); await A.s.sync(); await B.s.sync();
  assert.equal(A.db.centers[0].name, 'من B'); assert.equal(B.db.centers[0].name, 'من B');
  const r1 = await A.s.sync(); assert.equal(r1.wrote, 0); assert.equal(r1.applied, 0); assert.equal(A.s.pending(), 0);
});
