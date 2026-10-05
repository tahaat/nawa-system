import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http';
import { openDb, addUser, createApp } from '../server/server.js'; import { createSync, newMeta } from '../core/sync.js';
import { newDb } from '../core/model.js'; import { tiny } from './fixture.js'; import { reconcile } from '../core/validate.js';

async function setup() {
  const sdb = openDb(':memory:'), tokA = addUser(sdb, 'a', 'entry'), tokB = addUser(sdb, 'b', 'meal');
  const srv = http.createServer(createApp(sdb)); await new Promise((r) => srv.listen(0, r));
  const url = 'http://127.0.0.1:' + srv.address().port;
  const mk = (tok, db = newDb()) => { const meta = newMeta(); return { db, meta, s: createSync({ db, meta, cfg: { url, token: tok } }) }; };
  return { sdb, srv, url, A: mk(tokA), B: mk(tokB), mk, tokA };
}
test('رفض الرمز الخاطئ', async () => {
  const { srv, url } = await setup(); const c = createSync({ db: newDb(), meta: newMeta(), cfg: { url, token: 'bad' } });
  await assert.rejects(c.sync(), /رمز الدخول/); srv.close();
});
test('جهازان: دفع وسحب وتعديل وحذف وتكامل', async () => {
  const { srv, A, B } = await setup();
  Object.assign(A.db, tiny());                                  // الجهاز A يدخل بيانات
  let r = await A.s.sync(); assert.ok(r.pushed > 10);
  r = await B.s.sync(); assert.equal(B.db.sessions.length, 6); assert.equal(B.db.beneficiaries.length, 5);
  assert.deepEqual(reconcile(B.db).filter((x) => x.level === 'error'), []);   // التكامل سليم بعد المزامنة
  B.db.beneficiaries[0].name = 'اسم معدّل من B';                 // B يعدّل
  A.db.sessions = A.db.sessions.filter((s) => s.id !== 's6');   // A يحذف جلسة
  await B.s.sync(); await A.s.sync(); await B.s.sync();
  assert.equal(A.db.beneficiaries[0].name, 'اسم معدّل من B');
  assert.equal(B.db.sessions.length, 5); assert.ok(!B.db.sessions.find((s) => s.id === 's6'));
  assert.equal(A.s.pending().length, 0); assert.equal(B.s.pending().length, 0);   // لا تغييرات معلّقة
  srv.close();
});
test('تعارض على نفس السجل: الأحدث يفوز ويتقارب الجهازان', async () => {
  let t = 1000; const { srv, url, sdb, tokA } = await setup(); const tokB = (await import('../server/server.js')).addUser(sdb, 'c', 'entry');
  const mk = (tok, tick) => { const db = newDb(), meta = newMeta(); return { db, meta, s: createSync({ db, meta, cfg: { url, token: tok }, now: () => tick() }) }; };
  const A = mk(tokA, () => (t += 1)), B = mk(tokB, () => (t += 1));
  A.db.centers.push({ id: 'c1', name: 'أصل' }); await A.s.sync(); await B.s.sync();
  A.db.centers[0].name = 'من A'; B.db.centers[0].name = 'من B';
  await A.s.sync();           // A يدفع أولًا (ts أقدم)
  await B.s.sync();           // B أحدث ⇒ يفوز
  await A.s.sync();
  assert.equal(A.db.centers[0].name, 'من B'); assert.equal(B.db.centers[0].name, 'من B');
  srv.close();
});
test('جهاز جديد بوضع الاستبدال، والانقطاع ثم الاستئناف', async () => {
  const { srv, A, mk, tokA } = await setup(); Object.assign(A.db, tiny()); await A.s.sync();
  const C = mk(tokA, Object.assign(newDb(), { centers: [{ id: 'junk', name: 'قديم' }] }));
  await C.s.sync({ firstMode: 'replace' }); assert.ok(!C.db.centers.find((c) => c.id === 'junk')); assert.equal(C.db.sessions.length, 6);
  const D = mk(tokA); D.s = createSync({ db: D.db, meta: D.meta, cfg: { url: 'http://127.0.0.1:1', token: tokA } });
  D.db.centers.push({ id: 'off', name: 'بلا اتصال' }); await assert.rejects(D.s.sync());
  assert.equal(D.s.pending().length, 1);                                     // التغيير محفوظ للمحاولة التالية
  srv.close();
});
