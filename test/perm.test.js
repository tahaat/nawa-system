import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http';
import { openDb, addUser, createApp } from '../server/server.js'; import { createSync, newMeta } from '../core/sync.js'; import { newDb } from '../core/model.js'; import { tiny } from './fixture.js';

test('الصلاحيات تُفرض على الخادم: المنسق يرى مركزه فقط ولا يرى الحقول المخفية ولا يكتب خارج مركزه', async () => {
  const sdb = openDb(':memory:'), admin = addUser(sdb, 'admin', 'admin'), coord = addUser(sdb, 'مها', 'coordinator', ['c1']), entry = addUser(sdb, 'ent', 'entry');
  const srv = http.createServer(createApp(sdb)); await new Promise((r) => srv.listen(0, r)); const url = 'http://127.0.0.1:' + srv.address().port;
  const mk = (tok) => { const db = newDb(), meta = newMeta(); return { db, meta, s: createSync({ db, meta, cfg: { url, token: tok } }) }; };
  try {
    const AD = mk(admin); Object.assign(AD.db, tiny()); AD.db.beneficiaries[0].phone = '0599111222'; AD.db.beneficiaries[0].dob = '2018-01-01'; AD.db.beneficiaries[2].disabilityType = 'حركية';
    await AD.s.sync();
    const CO = mk(coord); await CO.s.sync();
    // يرى جلسات c1 فقط (s1,s2,s4,s5,s6) لا s3 (c2)
    assert.deepEqual(CO.db.sessions.map((s) => s.id).sort(), ['s1', 's2', 's4', 's5', 's6']);
    assert.equal(CO.db.projects.length, 1); assert.equal(CO.db.centers.length, 2);
    // الحقول المخفية غير موجودة محليًا
    assert.ok(CO.db.beneficiaries.every((b) => !('phone' in b) && !('disabilityType' in b)));
    // يعدّل اسم مستفيد → ينجح، وتبقى الحقول المخفية على الخادم
    CO.db.beneficiaries[0].name = 'اسم عدّلته المنسقة'; await CO.s.sync(); await AD.s.sync();
    const b0 = AD.db.beneficiaries.find((b) => b.id === CO.db.beneficiaries[0].id); assert.equal(b0.name, 'اسم عدّلته المنسقة'); assert.equal(b0.phone, '0599111222'); assert.equal(b0.dob, '2018-01-01'); assert.equal(AD.db.beneficiaries.find((b) => b.id === 'b3').disabilityType, 'حركية');
    // جلسة جديدة في مركزها ✓ ، وفي مركز آخر ✗ ، وتعديل مشروع ✗
    CO.db.sessions.push({ id: 'ok1', projectId: 'p1', activityId: 'a1', centerId: 'c1', date: '2026-06-01', educator: 'x', mode: 'counts', counts: { M: 1, F: 1, MWD: 0, FWD: 0 } });
    CO.db.sessions.push({ id: 'bad1', projectId: 'p1', activityId: 'a1', centerId: 'c2', date: '2026-06-02', educator: 'x', mode: 'counts', counts: { M: 1, F: 1, MWD: 0, FWD: 0 } });
    CO.db.projects[0].name = 'تخريب'; CO.db.centers.push({ id: 'cX', name: 'مركز مزيف' });
    await CO.s.sync(); await AD.s.sync();
    assert.ok(AD.db.sessions.find((s) => s.id === 'ok1')); assert.ok(!AD.db.sessions.find((s) => s.id === 'bad1'));
    assert.equal(AD.db.projects[0].name, 'مشروع تجريبي'); assert.ok(!AD.db.centers.find((c) => c.id === 'cX'));
    assert.ok(!CO.db.sessions.find((s) => s.id === 'bad1'));       // سُحبت من جهازها
    assert.equal(CO.db.projects[0].name, 'مشروع تجريبي'); assert.ok(!CO.db.centers.find((c) => c.id === 'cX')); assert.equal(CO.s.pending().length, 0);   // وارتدّت تعديلاتها المحظورة
    // حذف جلسة في مركز آخر من المدير: المنسق لا يتلقى أثرها، وحذف في مركزه يصله
    AD.db.sessions = AD.db.sessions.filter((s) => s.id !== 's3' && s.id !== 's1'); await AD.s.sync(); await CO.s.sync();
    assert.ok(!CO.db.sessions.find((s) => s.id === 's1')); assert.equal(CO.db.sessions.length, 5 - 1 + 1);
    // المدخِل (entry): لا يكتب المشاريع ويقرأ كل الجلسات
    const EN = mk(entry); await EN.s.sync(); assert.equal(EN.db.sessions.length, AD.db.sessions.length);
    EN.db.projects[0].name = 'x'; await EN.s.sync(); await AD.s.sync(); assert.equal(AD.db.projects[0].name, 'مشروع تجريبي');
    // /api/users للمدير فقط
    const r1 = await fetch(url + '/api/users', { headers: { authorization: 'Bearer ' + coord } }); assert.equal(r1.status, 403);
    const r2 = await fetch(url + '/api/users', { headers: { authorization: 'Bearer ' + admin } }); assert.equal((await r2.json()).users.length, 3);
  } finally { srv.close(); }
});
