// اختبار نقطة الاستعادة على Worker محلي (wrangler dev --local --port 8799 + .dev.vars). يدوي.
const B = process.env.W || 'http://localhost:8799', ok = (n, c) => { console.log(c ? 'ok  ' : 'FAIL', n); if (!c) process.exitCode = 1; };
const call = async (who, path, method = 'GET', body) => { const r = await fetch(B + path, { method, headers: { 'x-dev-email': who, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch { /* */ } return { s: r.status, j }; };
const A = 'admin@test.local', F = 'fac@test.local', ts = Date.now();
await call(A, '/api/me'); await call(A, '/api/users', 'POST', { email: F, role: 'facilitator' });
const push = (c) => call(A, '/api/push', 'POST', { changes: c });
await push([{ coll: 'projects', id: 'p1', data: { id: 'p1', name: 'P1' }, ts, baseSeq: 0 }, { coll: 'centers', id: 'c1', data: { id: 'c1', name: 'C1' }, ts, baseSeq: 0 }, { coll: 'sessions', id: 's1', data: { id: 's1', projectId: 'p1', centerId: 'c1', date: '2026-10-01' }, ts, baseSeq: 0 }]);
const bk = (await call(A, '/api/backup')).j; ok('النسخة تحوي السجلات', bk.app === 'naseej' && bk.tables.records.length >= 3);
ok('منشّط لا ينسخ', (await call(F, '/api/backup')).s === 403); ok('منشّط لا يستعيد', (await call(F, '/api/restore', 'POST', { backup: bk })).s === 403);
await push([{ coll: 'sessions', id: 's1', data: null, ts: ts + 10, baseSeq: 0 }, { coll: 'sessions', id: 's2', data: { id: 's2', projectId: 'p1', centerId: 'c1', date: '2026-10-02' }, ts: ts + 20, baseSeq: 0 }]);   // حذف s1 وإضافة s2 بعد النسخة
const seq0 = (await call(A, '/api/me')).j.seq;
const pv = await call(A, '/api/restore', 'POST', { backup: bk, mode: 'missing', apply: false });
ok('المعاينة: يُسترجع s1 فقط', pv.j.preview && pv.j.counts.sessions?.revive === 1 && pv.j.total === 1);
ok('المعاينة تُرجع قائمة السجلات', pv.j.items?.length === 1 && pv.j.items[0].id === 's1');
ok('ids غير مطابقة ⇒ لا شيء يُعاد', (await call(A, '/api/restore', 'POST', { backup: bk, mode: 'missing', ids: ['sessions|zzz'], apply: false })).j.total === 0);
ok('المعاينة لا تغيّر شيئًا', (await call(A, '/api/me')).j.seq === seq0);
const ap = await call(A, '/api/restore', 'POST', { backup: bk, mode: 'missing', apply: true }); ok('التطبيق: أُعيد سجل واحد', ap.j.applied === 1);
const pu = (await call(A, '/api/pull?since=' + seq0)).j; const got = pu.records.map((r) => r.coll + ':' + r.id + ':' + (r.deleted ? 'del' : 'live'));
ok('s1 عاد حيًّا وبتسلسل جديد (يصل للأجهزة)', got.includes('sessions:s1:live') && !got.some((x) => x.startsWith('sessions:s2')));
const all = (await call(A, '/api/pull?since=0')).j.records.map((r) => r.coll + ':' + r.id + ':' + (r.deleted ? 'del' : 'live')); ok('s2 (الأحدث) لم يُمس', all.includes('sessions:s2:live'));
ok('إعادة التطبيق لا تفعل شيئًا (idempotent)', (await call(A, '/api/restore', 'POST', { backup: bk, mode: 'missing', apply: true })).j.applied === 0);
ok('ملف غير صالح ⇒ 400', (await call(A, '/api/restore', 'POST', { backup: { app: 'x' } })).s === 400);
ok('التدقيق سجّل الاستعادة', (await call(A, '/api/audit?limit=20')).j.rows.some((r) => r.action === 'restore'));
