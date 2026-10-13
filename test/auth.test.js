import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http';
import { openDb, addUser, createApp, setPassword } from '../server/server.js';

const boot = async () => { const db = openDb(':memory:'), srv = http.createServer(createApp(db)); await new Promise((r) => srv.listen(0, r)); const url = 'http://127.0.0.1:' + srv.address().port; const call = async (path, tok, method = 'GET', body) => { const r = await fetch(url + path, { method, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; }; return { db, srv, call }; };
const login = (call, name, password) => call('/api/login', null, 'POST', { name, password, device: 'test' });
const rec = (coll, id, data) => ({ coll, id, data, ts: Date.now(), baseSeq: 0 });

test('تسجيل الدخول بكلمة مرور، القفل بعد 5 محاولات، وتغيير كلمة المرور', async () => {
  const { db, srv, call } = await boot();
  try {
    addUser(db, 'سارة', 'facilitator'); setPassword(db, 'سارة', 'GoodPass123', 1);
    assert.equal((await login(call, 'سارة', 'wrong')).s, 401); assert.equal((await login(call, 'مجهول', 'x')).s, 401);
    const ok = await login(call, 'سارة', 'GoodPass123'); assert.equal(ok.s, 200); assert.ok(ok.j.token); assert.equal(ok.j.mustChange, true);
    assert.equal((await call('/api/me', ok.j.token)).j.name, 'سارة');
    assert.equal((await call('/api/password', ok.j.token, 'POST', { old: 'GoodPass123', new: 'short' })).s, 400);
    assert.equal((await call('/api/password', ok.j.token, 'POST', { old: 'bad', new: 'NewPass4567' })).s, 403);
    assert.equal((await call('/api/password', ok.j.token, 'POST', { old: 'GoodPass123', new: 'NewPass4567' })).s, 200);
    assert.equal((await login(call, 'سارة', 'GoodPass123')).s, 401); assert.equal((await login(call, 'سارة', 'NewPass4567')).s, 200);
    for (let i = 0; i < 5; i++) await login(call, 'سارة', 'x'); const lk = await login(call, 'سارة', 'NewPass4567'); assert.equal(lk.s, 429);
    await call('/api/logout', ok.j.token, 'POST'); assert.equal((await call('/api/me', ok.j.token)).s, 401);
  } finally { srv.close(); }
});

test('التكليفات: المنشط يرى ويكتب ضمن مشروعه ومركزه وفترته فقط، وانتهاء التكليف يقطع الوصول', async () => {
  const { db, srv, call } = await boot();
  try {
    const admin = addUser(db, 'admin', 'admin');
    await call('/api/push', admin, 'POST', { changes: [rec('projects', 'p1', { id: 'p1', name: 'م1' }), rec('projects', 'p2', { id: 'p2', name: 'م2' }),
      rec('sheets', 'sh1', { id: 'sh1', projectId: 'p1', centerId: 'c1' }), rec('sheets', 'sh2', { id: 'sh2', projectId: 'p2', centerId: 'c1' }), rec('sheets', 'sh3', { id: 'sh3', projectId: 'p1', centerId: 'c2' }),
      rec('beneficiaries', 'b1', { id: 'b1', name: 'اسم', phone: '059', disabilityType: 'x' }), rec('enrollments', 'en_b1_p1', { id: 'en_b1_p1', beneficiaryId: 'b1', projectId: 'p1', status: 'active' }), rec('ops', 'o1', { id: 'o1', projectId: 'p1', centerId: 'c1' })] });
    const mk = await call('/api/users', admin, 'POST', { name: 'منشط1', role: 'facilitator', assignments: [{ project: 'p1', center: 'c1', from: '', to: '' }] }); assert.equal(mk.s, 200); assert.ok(mk.j.password.length >= 8);
    const t = (await login(call, 'منشط1', mk.j.password)).j.token;
    const pull = async () => (await call('/api/pull?since=0', t)).j.records; let r = await pull();
    assert.deepEqual(r.filter((x) => x.coll === 'sheets').map((x) => x.id), ['sh1']); assert.deepEqual(r.filter((x) => x.coll === 'projects').map((x) => x.id), ['p1']); assert.ok(!r.some((x) => x.coll === 'ops'));
    const b = r.find((x) => x.coll === 'beneficiaries'); assert.ok(b && !('phone' in b.data) && !('disabilityType' in b.data));
    // كتابة: داخل التكليف ✓، مشروع آخر ✗، مركز آخر ✗، تعديل مستفيد موجود ✗، مستفيد جديد ✓
    const w = await call('/api/push', t, 'POST', { changes: [rec('sheets', 'n1', { id: 'n1', projectId: 'p1', centerId: 'c1' }), rec('sheets', 'n2', { id: 'n2', projectId: 'p2', centerId: 'c1' }), rec('sheets', 'n3', { id: 'n3', projectId: 'p1', centerId: 'c2' }), rec('beneficiaries', 'b1', { id: 'b1', name: 'تخريب' }), rec('beneficiaries', 'b9', { id: 'b9', name: 'جديد' }), rec('projects', 'p1', { id: 'p1', name: 'تخريب' })] });
    assert.deepEqual(w.j.results.map((x) => x.id).sort(), ['b9', 'n1']); assert.equal(w.j.forbidden.length, 4);
    // انتهاء التكليف: لا وصول
    await call('/api/users', admin, 'PUT', { name: 'منشط1', assignments: [{ project: 'p1', center: 'c1', from: '2020-01-01', to: '2020-12-31' }] });
    r = await pull(); assert.ok(!r.some((x) => x.coll === 'sheets' || x.coll === 'projects'));
    // نقل إلى مشروع آخر دون حساب جديد
    await call('/api/users', admin, 'PUT', { name: 'منشط1', assignments: [{ project: 'p2', center: 'c1' }] }); r = await pull(); assert.deepEqual(r.filter((x) => x.coll === 'sheets').map((x) => x.id), ['sh2']);
  } finally { srv.close(); }
});

test('مسؤول المشاريع، التعطيل يقطع الجلسات، الأجهزة، وسجل التدقيق', async () => {
  const { db, srv, call } = await boot();
  try {
    const admin = addUser(db, 'admin', 'admin');
    await call('/api/push', admin, 'POST', { changes: [rec('projects', 'p1', { id: 'p1', name: 'م1' }), rec('projects', 'p2', { id: 'p2', name: 'م2' }), rec('ops', 'o1', { id: 'o1', projectId: 'p1', centerId: 'c1' }), rec('ops', 'o2', { id: 'o2', projectId: 'p2', centerId: 'c1' })] });
    const mk = await call('/api/users', admin, 'POST', { name: 'مسؤول', role: 'projects', assignments: [{ project: 'p1' }] }), t = (await login(call, 'مسؤول', mk.j.password)).j.token;
    const r = (await call('/api/pull?since=0', t)).j.records; assert.deepEqual(r.filter((x) => x.coll === 'ops').map((x) => x.id), ['o1']);
    assert.equal((await call('/api/users', t)).s, 403); assert.equal((await call('/api/audit', t)).s, 403);
    const dev = (await call('/api/sessions', admin)).j.sessions; assert.equal(dev.length, 1);
    await call('/api/users/disable', admin, 'POST', { name: 'مسؤول', active: false }); assert.equal((await call('/api/me', t)).s, 401);
    const a = (await call('/api/audit', admin)).j.rows.map((x) => x.action); for (const k of ['add_user', 'login', 'disable_user', 'add']) assert.ok(a.includes(k), k);
    assert.equal((await login(call, 'مسؤول', mk.j.password)).s, 401);
    const mk2 = await call('/api/users', admin, 'PUT', { name: 'admin', role: 'entry' }); assert.equal((await call('/api/me', admin)).j.role, 'admin'); // لا يخفض المدير نفسه
  } finally { srv.close(); }
});

test('المستفيد يظهر للمنشط عبر الانتماء للمشروع فقط (متعدد المشاريع)، ويظهر لاحقًا عند الانتماء الجديد', async () => {
  const { db, srv, call } = await boot();
  try {
    const admin = addUser(db, 'admin', 'admin');
    await call('/api/push', admin, 'POST', { changes: [rec('projects', 'p1', { id: 'p1', name: 'م1' }), rec('projects', 'p2', { id: 'p2', name: 'م2' }),
      rec('beneficiaries', 'bA', { id: 'bA', name: 'أ', phone: '059' }), rec('beneficiaries', 'bB', { id: 'bB', name: 'ب' }), rec('beneficiaries', 'bC', { id: 'bC', name: 'ج' }),
      rec('enrollments', 'e1', { id: 'e1', beneficiaryId: 'bA', projectId: 'p1', status: 'active' }), rec('enrollments', 'e2', { id: 'e2', beneficiaryId: 'bA', projectId: 'p2', status: 'active' }),
      rec('enrollments', 'e3', { id: 'e3', beneficiaryId: 'bB', projectId: 'p2', status: 'active' }), rec('enrollments', 'e4', { id: 'e4', beneficiaryId: 'bC', projectId: 'p1', status: 'ended' })] });
    const mk = await call('/api/users', admin, 'POST', { name: 'م1', role: 'facilitator', assignments: [{ project: 'p1' }] }), t = (await login(call, 'م1', mk.j.password)).j.token;
    const ids = async (since = 0) => (await call('/api/pull?since=' + since, t)).j.records.filter((x) => x.coll === 'beneficiaries').map((x) => x.id).sort();
    assert.deepEqual(await ids(), ['bA']); // بB في مشروع آخر، وbC انتماؤه منتهٍ
    const seq = (await call('/api/pull?since=0', t)).j.seq;
    // انتماء جديد لـ bB في p1 (سجل المستفيد أقدم من since) ⇒ يصل مع الانتماء
    await call('/api/push', admin, 'POST', { changes: [rec('enrollments', 'e5', { id: 'e5', beneficiaryId: 'bB', projectId: 'p1', status: 'active' })] });
    assert.deepEqual(await ids(seq), ['bB']);
    // يكتب انتماءً في مشروعه فقط
    const w = await call('/api/push', t, 'POST', { changes: [rec('enrollments', 'e6', { id: 'e6', beneficiaryId: 'bA', projectId: 'p1', status: 'ended' }), rec('enrollments', 'e7', { id: 'e7', beneficiaryId: 'bA', projectId: 'p2', status: 'active' })] });
    assert.deepEqual(w.j.results.map((x) => x.id), ['e6']); assert.equal(w.j.forbidden.length, 1);
  } finally { srv.close(); }
});
