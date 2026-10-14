import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createFolderSync, newFolderMeta } from '../core/sync-folder.js'; import { newDb } from '../core/model.js'; import { tiny } from './fixture.js';
// جهاز بمجلدات قناة؛ ro = قنوات للعرض فقط (الكتابة تُرفض كما يفعل OneDrive عند مشاركة «عرض فقط»)
function dev(root, ro = []) {
  return { async channels() { return fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }, async ensure() {},
    async list(ch) { return fs.readdirSync(path.join(root, ch)).map((n) => { const s = fs.statSync(path.join(root, ch, n)); return { name: n, mtime: s.mtimeMs, size: s.size }; }); },
    async read(ch, n) { return fs.readFileSync(path.join(root, ch, n), 'utf8'); },
    async write(ch, n, t) { if (ro.includes(ch)) throw new Error('NotAllowedError'); fs.writeFileSync(path.join(root, ch, n), t); fs.utimesSync(path.join(root, ch, n), new Date(), new Date()); } };
}
const mkRoot = (chs) => { const r = fs.mkdtempSync(path.join(os.tmpdir(), 'fay-')); for (const c of chs) fs.mkdirSync(path.join(r, c)); return r; };
function cloud(roots, ro = {}) { for (const [ia, a] of roots.entries()) for (const ch of fs.readdirSync(a)) for (const f of fs.readdirSync(path.join(a, ch))) for (const [ib, b] of roots.entries()) { if (a === b || !fs.existsSync(path.join(b, ch))) continue; fs.copyFileSync(path.join(a, ch, f), path.join(b, ch, f)); } }
const mk = (root, ro, tick) => { const db = newDb(), meta = newFolderMeta(); return { root, db, meta, s: createFolderSync({ db, meta, dir: dev(root, ro), now: tick }) }; };

test('محاكاة فيحاء (مسؤولة مشاريع): core تحرير، مراكز عرض، بلا pii', async () => {
  let t = 1000; const tick = () => (t += 10);
  const rA = mkRoot(['core', 'pii', 'c-c1', 'c-c2']), rF = mkRoot(['core', 'c-c1', 'c-c2']);
  const A = mk(rA, [], tick), F = mk(rF, ['c-c1', 'c-c2'], tick);
  Object.assign(A.db, tiny()); A.db.beneficiaries[0].phone = '0599111222';
  await A.s.sync(); cloud([rA, rF]);
  // 1) أول مزامنة لفيحاء
  let r = await F.s.sync({ firstMode: 'replace' }); console.log('first', JSON.stringify(r));
  assert.equal(F.db.beneficiaries.length, 5); assert.ok(F.db.sessions.length >= 5); assert.ok(F.db.beneficiaries.every((b) => !('phone' in b)));
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  // 2) تعدّل مشروعًا (core) ← يصل المدير
  F.db.projects[0].name = 'اسم من فيحاء'; r = await F.s.sync(); assert.equal(r.errors.length, 0); cloud([rF, rA]); await A.s.sync();
  assert.equal(A.db.projects[0].name, 'اسم من فيحاء'); assert.equal(A.db.beneficiaries[0].phone, '0599111222');
  // 3) تعدّل مستفيدًا: الهاتف عند المدير لا يُمحى
  F.db.beneficiaries[0].name = 'تعديل فيحاء'; await F.s.sync(); cloud([rF, rA]); await A.s.sync();
  assert.equal(A.db.beneficiaries[0].name, 'تعديل فيحاء'); assert.equal(A.db.beneficiaries[0].phone, '0599111222');
  // 4) تضيف جلسة في مركز للعرض فقط ← خطأ واضح، لا يصل المدير، ولا يتكرر الخطأ بشكل مضلل
  F.db.sessions.push({ id: 'fx', projectId: 'p1', activityId: 'a1', centerId: 'c1', date: '2026-06-01', educator: 'x', mode: 'counts', counts: { M: 1, F: 1, MWD: 0, FWD: 0 } });
  r = await F.s.sync(); console.log('ro write', JSON.stringify(r.errors)); assert.ok(r.errors.length >= 1);
  cloud([rF, rA]); await A.s.sync(); assert.ok(!A.db.sessions.find((s) => s.id === 'fx'));
  // 5) بعد ذلك: تعديل في core لا يتأثر بخطأ المركز
  F.db.projects[0].name = 'تعديل ثانٍ'; r = await F.s.sync(); cloud([rF, rA]); await A.s.sync(); assert.equal(A.db.projects[0].name, 'تعديل ثانٍ');
  // 6) المدير يضيف جلسة ← تصل فيحاء
  A.db.sessions.push({ id: 'ax', projectId: 'p1', activityId: 'a1', centerId: 'c2', date: '2026-06-03', educator: 'y', mode: 'counts', counts: { M: 2, F: 0, MWD: 0, FWD: 0 } });
  await A.s.sync(); cloud([rA, rF]); await F.s.sync(); assert.ok(F.db.sessions.find((s) => s.id === 'ax'));
  // 7) هل الجلسة المعلّقة 'fx' ما زالت عند فيحاء؟ (لا تُفقد)
  assert.ok(F.db.sessions.find((s) => s.id === 'fx'));
});
