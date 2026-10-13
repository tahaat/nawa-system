// خادم المزامنة (Node 22+، بلا تبعيات): SQLite + HTTP. يُستضاف على سحابتك خلف HTTPS.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const COLLS = ['projects', 'centers', 'beneficiaries', 'sessions', 'enrollments', 'surveyResponses', 'sheets', 'ops'];
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS records(coll TEXT, id TEXT, data TEXT, ts INTEGER, deleted INTEGER DEFAULT 0, seq INTEGER, by_user TEXT, center TEXT, PRIMARY KEY(coll,id));
   CREATE TABLE IF NOT EXISTS policy(k TEXT PRIMARY KEY, v TEXT);
   CREATE INDEX IF NOT EXISTS rec_seq ON records(seq);
   CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY, token_hash TEXT UNIQUE, role TEXT, centers TEXT, active INTEGER DEFAULT 1);
   CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v INTEGER);
   CREATE TABLE IF NOT EXISTS audit(at INTEGER, user TEXT, action TEXT, detail TEXT);
   INSERT OR IGNORE INTO meta VALUES('seq',0);`);
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name), add = (t, c, d) => { if (!cols(t).includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${d}`); };
  add('users', 'pw_salt', 'TEXT'); add('users', 'pw_hash', 'TEXT'); add('users', 'assignments', "TEXT DEFAULT '[]'"); add('users', 'fails', 'INTEGER DEFAULT 0'); add('users', 'locked_until', 'INTEGER DEFAULT 0'); add('users', 'must_change', 'INTEGER DEFAULT 0'); add('users', 'last_login', 'INTEGER'); add('records', 'project', 'TEXT');
  db.exec('CREATE TABLE IF NOT EXISTS sessions(tok_hash TEXT PRIMARY KEY, user TEXT, device TEXT, created INTEGER, last INTEGER, revoked INTEGER DEFAULT 0)');
  return db;
}
// ===== كلمات المرور (scrypt) =====
const MIN_PW = 8;
const pwHash = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
export function setPassword(db, name, pw, mustChange = 0) { const salt = crypto.randomBytes(16).toString('hex'); db.prepare('UPDATE users SET pw_salt=?,pw_hash=?,must_change=?,fails=0,locked_until=0 WHERE name=?').run(salt, pwHash(pw, salt), mustChange, name); }
const checkPw = (u, pw) => { if (!u?.pw_hash || !u.pw_salt) return false; const a = Buffer.from(pwHash(pw, u.pw_salt), 'hex'), b = Buffer.from(u.pw_hash, 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
export const genPassword = () => { const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from(crypto.randomBytes(10), (x) => A[x % A.length]).join(''); };
// ===== التكليفات: (مشروع + مركز + فترة) =====
const today = () => new Date().toISOString().slice(0, 10);
export const activeAssign = (u) => { let a = []; try { a = JSON.parse(u.assignments || '[]'); } catch { /* */ } const t = today(); return a.filter((x) => (!x.from || x.from <= t) && (!x.to || x.to >= t)); };
// ===== الصلاحيات: تُفرض على الخادم (الواجهة تخفي فقط للراحة) =====
const ALL = Object.fromEntries(COLLS.map((c) => [c, 'all']));
export const DEFAULT_POLICY = {
  admin: { read: ALL, write: ALL, hidden: {}, routes: '*', manageUsers: true },
  meal: { read: ALL, write: ALL, hidden: {}, routes: '*' },
  entry: { read: ALL, write: { sessions: 'all', sheets: 'all', ops: 'all', beneficiaries: 'all', centers: 'all', surveyResponses: 'all', enrollments: 'all' }, hidden: {}, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'centers', 'check', 'surveys', 'export', 'cloud'] },
  projects: { read: { projects: 'proj', centers: 'all', beneficiaries: 'enr', sessions: 'proj', sheets: 'proj', ops: 'proj', surveyResponses: 'proj', enrollments: 'proj' }, write: { projects: 'proj', sessions: 'proj', sheets: 'proj', ops: 'proj', enrollments: 'proj' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'projects', 'plan', 'check', 'surveys', 'export', 'cloud'] },
  facilitator: { read: { projects: 'proj', centers: 'all', beneficiaries: 'enr', sessions: 'proj', sheets: 'proj', surveyResponses: 'proj', enrollments: 'proj' }, write: { sessions: 'proj', sheets: 'proj', surveyResponses: 'proj', beneficiaries: 'create', enrollments: 'proj' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['sheets', 'sessions', 'surveys', 'cloud'] },
  coordinator: { read: { projects: 'all', centers: 'all', beneficiaries: 'all', sessions: 'own', sheets: 'own', ops: 'own', surveyResponses: 'own', enrollments: 'all' }, write: { sessions: 'own', sheets: 'own', ops: 'own', beneficiaries: 'all', surveyResponses: 'own', enrollments: 'all' }, hidden: { beneficiaries: ['phone', 'disabilityType'] }, routes: ['dash', 'sheets', 'sessions', 'ops', 'bnf', 'check', 'surveys', 'cloud'] },
};
export function getPolicy(db) { const r = db.prepare("SELECT v FROM policy WHERE k='roles'").get(); return r ? { ...DEFAULT_POLICY, ...JSON.parse(r.v), admin: DEFAULT_POLICY.admin } : DEFAULT_POLICY; }
export function setPolicy(db, p) { db.prepare("INSERT OR REPLACE INTO policy VALUES('roles',?)").run(JSON.stringify(p)); }
export const projectOf = (coll, d) => (!d ? null : coll === 'projects' ? d.id : ['sessions', 'sheets', 'ops', 'enrollments'].includes(coll) ? d.projectId ?? null : coll === 'surveyResponses' ? d.projectId ?? d.answers?.projectId ?? null : null);
export const centerOf = (coll, d) => (!d ? null : (coll === 'sessions' || coll === 'sheets' || coll === 'ops') ? d.centerId ?? null : coll === 'surveyResponses' ? d.answers?.center ?? null : null);
const userCenters = (u) => { let c = []; try { c = JSON.parse(u.centers || '[]'); } catch { /* */ } return [...new Set([...c, ...activeAssign(u).map((a) => a.center).filter(Boolean)])]; };
const userProjects = (u) => [...new Set(activeAssign(u).map((a) => a.project).filter(Boolean))];
// النطاق: all | own (مراكزه) | proj (مشاريعه/تكليفاته) | create (إنشاء سجلات جديدة فقط)
const inScope = (sc, center, project, u, exists = false) => {
  if (sc === 'all') return true; if (sc === 'create') return !exists;
  if (sc === 'own') return !!center && userCenters(u).includes(center);
  if (sc === 'proj') { const as = activeAssign(u); if (!project) return false; return as.some((a) => a.project === project && (!a.center || !center || a.center === center)); }
  return false;
};
const stripHidden = (coll, data, pol) => { const h = pol.hidden?.[coll]; if (!h || !data) return data; const d = { ...data }; for (const f of h) delete d[f]; return d; };

export function addUser(db, name, role = 'entry', centers = []) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT OR REPLACE INTO users(name,token_hash,role,centers,active) VALUES(?,?,?,?,1)').run(name, sha(token), role, JSON.stringify(centers));
  return token;
}

export function createApp(db, { staticFile = null, maxBody = 20e6 } = {}) {
  const nextSeq = () => { db.prepare("UPDATE meta SET v=v+1 WHERE k='seq'").run(); return db.prepare("SELECT v FROM meta WHERE k='seq'").get().v; };
  const curSeq = () => db.prepare("SELECT v FROM meta WHERE k='seq'").get().v;
  const getRec = db.prepare('SELECT * FROM records WHERE coll=? AND id=?');
  const putRec = db.prepare('INSERT OR REPLACE INTO records(coll,id,data,ts,deleted,seq,by_user,center,project) VALUES(?,?,?,?,?,?,?,?,?)');
  const aud = (user, action, detail) => db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(Date.now(), user, action, detail);

  function push(user, changes) {
    const results = [], rejected = [], forbidden = [], pol = getPolicy(db)[user.role] || { read: {}, write: {} };
    db.exec('BEGIN');
    try {
      for (const c of changes) {
        if (!COLLS.includes(c.coll) || !c.id) { results.push({ coll: c.coll, id: c.id, error: 'bad' }); continue; }
        const ex = getRec.get(c.coll, c.id), w = pol.write?.[c.coll];
        const fb = () => { const rd = pol.read?.[c.coll]; const vis = ex && !ex.deleted && inScope(rd, ex.center, ex.project, user); forbidden.push({ coll: c.coll, id: c.id, server: vis ? stripHidden(c.coll, JSON.parse(ex.data), pol) : null, seq: ex?.seq || 0 }); };
        if (!w) { fb(); continue; }
        const center = centerOf(c.coll, c.data) ?? ex?.center ?? null, project = projectOf(c.coll, c.data) ?? ex?.project ?? null, exists = !!ex && !ex.deleted;
        if (!inScope(w, center, project, user, exists) || (exists && (w === 'own' || w === 'proj') && !inScope(w, ex.center, ex.project, user))) { fb(); continue; }
        if (c.data && pol.hidden?.[c.coll] && ex && !ex.deleted) { const old = JSON.parse(ex.data); c.data = { ...c.data }; for (const f of pol.hidden[c.coll]) { if (f in old) c.data[f] = old[f]; else delete c.data[f]; } } // حقول مخفية عن المستخدم تبقى كما هي
        if (ex && ex.seq > (c.baseSeq || 0) && ex.ts > c.ts) { rejected.push({ coll: c.coll, id: c.id }); continue; } // السيرفر أحدث ⇒ يفوز
        const seq = nextSeq();
        putRec.run(c.coll, c.id, c.data == null ? null : JSON.stringify(c.data), c.ts, c.data == null ? 1 : 0, seq, user.name, center, project);
        results.push({ coll: c.coll, id: c.id, seq }); aud(user.name, c.data == null ? 'del' : ex ? 'edit' : 'add', c.coll + ':' + c.id + (project ? ' p=' + project : '') + (center ? ' c=' + center : ''));
      }
      aud(user.name, 'push', `${results.length} ok, ${rejected.length} rejected, ${forbidden.length} forbidden`);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return { results, rejected, forbidden, seq: curSeq() };
  }
  // معرّفات المستفيدين المنتمين (انتماء نشط) إلى مشاريع المستخدم المكلَّف بها
  function enrolledIds(user) {
    const ps = userProjects(user); if (!ps.length) return new Set();
    const rows = db.prepare(`SELECT data FROM records WHERE coll='enrollments' AND deleted=0 AND project IN (${ps.map(() => '?').join(',')})`).all(...ps), out = new Set();
    for (const r of rows) { try { const d = JSON.parse(r.data); if (d.status !== 'ended' && d.beneficiaryId) out.add(d.beneficiaryId); } catch { /* */ } }
    return out;
  }
  function pull(user, since, limit = 1000) {
    const pol = getPolicy(db)[user.role] || { read: {} };
    const rows = db.prepare('SELECT coll,id,data,ts,deleted,seq,center,project FROM records WHERE seq>? ORDER BY seq LIMIT ?').all(since, limit);
    const enr = pol.read?.beneficiaries === 'enr' ? enrolledIds(user) : null;
    const vis = rows.filter((r) => (r.coll === 'beneficiaries' && enr ? enr.has(r.id) : inScope(pol.read?.[r.coll], r.center, r.project, user)));
    const have = new Set(vis.filter((r) => r.coll === 'beneficiaries').map((r) => r.id));
    if (enr) { // انتماء جديد ظاهر ⇒ يلزم سجل المستفيد نفسه حتى لو كان أقدم من since
      for (const r of vis) {
        if (r.coll !== 'enrollments' || r.deleted) continue; let d; try { d = JSON.parse(r.data); } catch { continue; }
        if (!d.beneficiaryId || have.has(d.beneficiaryId) || d.status === 'ended' || !enr.has(d.beneficiaryId)) continue;
        const b = getRec.get('beneficiaries', d.beneficiaryId); if (b && !b.deleted) { vis.push(b); have.add(b.id); }
      }
    }
    return { records: vis.map((r) => ({ coll: r.coll, id: r.id, data: r.deleted ? null : stripHidden(r.coll, JSON.parse(r.data), pol), ts: r.ts, seq: r.seq })), seq: curSeq(), next: rows.length ? rows[rows.length - 1].seq : since, more: rows.length === limit };
  }

  return async (req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    const send = (code, obj, h = {}) => { const b = typeof obj === 'string' ? obj : JSON.stringify(obj); res.writeHead(code, { 'content-type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json', ...cors, ...h }); res.end(b); };
    if (req.method === 'OPTIONS') return send(204, '');
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/' && staticFile && fs.existsSync(staticFile)) return send(200, fs.readFileSync(staticFile, 'utf8').replace(/<head[^>]*>/i, (m) => m + '<meta name="nawa-server" content="1">'));
    if (url.pathname === '/api/health') return send(200, { ok: true });
    const readBody = async () => { let size = 0; const chunks = []; for await (const ch of req) { size += ch.length; if (size > maxBody) throw new Error('too large'); chunks.push(ch); } return JSON.parse(Buffer.concat(chunks).toString() || '{}'); };
    // تسجيل الدخول باسم مستخدم وكلمة مرور: قفل مؤقت بعد 5 محاولات فاشلة، ورسالة موحدة لا تكشف أي الحقلين خطأ
    if (url.pathname === '/api/login' && req.method === 'POST') {
      try {
        const b = await readBody(), u = db.prepare('SELECT * FROM users WHERE name=?').get(String(b.name || '')), now = Date.now();
        if (u && u.locked_until > now) { aud(String(b.name), 'login_locked', ''); return send(429, { error: 'locked', retryAfter: Math.ceil((u.locked_until - now) / 1000) }); }
        if (!u || !u.active || !checkPw(u, b.password)) { if (u) { const f = (u.fails || 0) + 1; db.prepare('UPDATE users SET fails=?,locked_until=? WHERE name=?').run(f, f >= 5 ? now + 10 * 60e3 : 0, u.name); } aud(String(b.name || '?').slice(0, 40), 'login_fail', ''); return send(401, { error: 'bad credentials' }); }
        const token = crypto.randomBytes(24).toString('hex'); db.prepare('UPDATE users SET fails=0,locked_until=0,last_login=? WHERE name=?').run(now, u.name);
        db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,0)').run(sha(token), u.name, String(b.device || req.headers['user-agent'] || '').slice(0, 80), now, now); aud(u.name, 'login', String(b.device || '').slice(0, 60));
        return send(200, { token, name: u.name, role: u.role, mustChange: !!u.must_change });
      } catch (e) { return send(400, { error: 'bad' }); }
    }
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''), th = tok && sha(tok);
    let user = null, sess = null;
    if (th) { sess = db.prepare('SELECT * FROM sessions WHERE tok_hash=? AND revoked=0').get(th); user = sess ? db.prepare('SELECT * FROM users WHERE name=? AND active=1').get(sess.user) : db.prepare('SELECT * FROM users WHERE token_hash=? AND active=1').get(th); if (sess && user) db.prepare('UPDATE sessions SET last=? WHERE tok_hash=?').run(Date.now(), th); }
    if (!user) return send(401, { error: 'unauthorized' });
    try {
      const POL = getPolicy(db), mypol = POL[user.role] || {};
      if (url.pathname === '/api/me') return send(200, { name: user.name, role: user.role, centers: userCenters(user), projects: userProjects(user), assignments: activeAssign(user), mustChange: !!user.must_change, seq: curSeq(), policy: { routes: mypol.routes || [], manageUsers: !!mypol.manageUsers, read: mypol.read || {}, write: mypol.write || {}, hidden: mypol.hidden || {} } });
      const body = readBody;
      if (url.pathname === '/api/logout' && req.method === 'POST') { if (sess) db.prepare('UPDATE sessions SET revoked=1 WHERE tok_hash=?').run(th); aud(user.name, 'logout', ''); return send(200, { ok: true }); }
      if (url.pathname === '/api/password' && req.method === 'POST') { const b = await body(); if (!user.pw_hash || !checkPw(user, b.old)) return send(403, { error: 'bad old' }); if (String(b.new || '').length < MIN_PW) return send(400, { error: 'short' }); setPassword(db, user.name, b.new, 0); aud(user.name, 'change_password', ''); return send(200, { ok: true }); }
      if (url.pathname.startsWith('/api/users') || url.pathname === '/api/policy' || url.pathname.startsWith('/api/sessions') || url.pathname === '/api/audit') {
        if (!mypol.manageUsers) return send(403, { error: 'forbidden' });
        const cleanAs = (a) => (Array.isArray(a) ? a : []).slice(0, 40).map((x) => ({ project: String(x.project || '').slice(0, 60), center: String(x.center || '').slice(0, 60), from: /^\d{4}-\d{2}-\d{2}$/.test(x.from || '') ? x.from : '', to: /^\d{4}-\d{2}-\d{2}$/.test(x.to || '') ? x.to : '' })).filter((x) => x.project || x.center);
        const revokeAll = (name) => db.prepare('UPDATE sessions SET revoked=1 WHERE user=?').run(name);
        if (url.pathname === '/api/users' && req.method === 'GET') return send(200, { users: db.prepare('SELECT name,role,centers,assignments,active,last_login FROM users').all().map((u) => ({ ...u, centers: userCenters(u), rawCenters: (() => { try { return JSON.parse(u.centers || '[]'); } catch { return []; } })(), assignments: (() => { try { return JSON.parse(u.assignments || '[]'); } catch { return []; } })(), devices: db.prepare('SELECT COUNT(*) n FROM sessions WHERE user=? AND revoked=0').get(u.name).n })) });
        if (url.pathname === '/api/users' && req.method === 'POST') { const b = await body(); if (!/^[\w\u0600-\u06FF .-]{2,40}$/.test(b.name || '') || !POL[b.role]) return send(400, { error: 'bad' }); if (db.prepare('SELECT 1 FROM users WHERE name=?').get(b.name)) return send(409, { error: 'exists' }); const token = addUser(db, b.name, b.role, b.centers || []); const pw = b.password && String(b.password).length >= MIN_PW ? String(b.password) : genPassword(); setPassword(db, b.name, pw, 1); db.prepare('UPDATE users SET assignments=? WHERE name=?').run(JSON.stringify(cleanAs(b.assignments)), b.name); aud(user.name, 'add_user', b.name + ':' + b.role); return send(200, { token, password: pw }); }
        if (url.pathname === '/api/users' && req.method === 'PUT') { const b = await body(), t = db.prepare('SELECT * FROM users WHERE name=?').get(b.name); if (!t) return send(404, { error: 'none' }); if (b.role && POL[b.role] && !(t.name === user.name && b.role !== user.role)) { db.prepare('UPDATE users SET role=? WHERE name=?').run(b.role, t.name); revokeAll(t.name); } if (b.assignments) db.prepare('UPDATE users SET assignments=? WHERE name=?').run(JSON.stringify(cleanAs(b.assignments)), t.name); if (b.centers) db.prepare('UPDATE users SET centers=? WHERE name=?').run(JSON.stringify(b.centers), t.name); let pw; if (b.resetPassword) { pw = genPassword(); setPassword(db, t.name, pw, 1); revokeAll(t.name); } aud(user.name, 'edit_user', t.name + (b.role ? ' role=' + b.role : '') + (b.assignments ? ' assign' : '') + (pw ? ' reset_pw' : '')); return send(200, { ok: true, password: pw }); }
        if (url.pathname === '/api/users/disable' && req.method === 'POST') { const b = await body(); if (b.name === user.name) return send(400, { error: 'self' }); db.prepare('UPDATE users SET active=? WHERE name=?').run(b.active ? 1 : 0, b.name); if (!b.active) revokeAll(b.name); aud(user.name, b.active ? 'enable_user' : 'disable_user', b.name); return send(200, { ok: true }); }
        if (url.pathname === '/api/sessions' && req.method === 'GET') return send(200, { sessions: db.prepare('SELECT tok_hash id,user,device,created,last FROM sessions WHERE revoked=0 ORDER BY last DESC LIMIT 200').all() });
        if (url.pathname === '/api/sessions/revoke' && req.method === 'POST') { const b = await body(); db.prepare('UPDATE sessions SET revoked=1 WHERE tok_hash=?').run(String(b.id || '')); aud(user.name, 'revoke_device', String(b.user || '')); return send(200, { ok: true }); }
        if (url.pathname === '/api/audit' && req.method === 'GET') { const u = url.searchParams.get('user'), n = Math.min(+url.searchParams.get('limit') || 200, 1000); return send(200, { rows: u ? db.prepare('SELECT * FROM audit WHERE user=? ORDER BY at DESC LIMIT ?').all(u, n) : db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT ?').all(n) }); }
        if (url.pathname === '/api/policy' && req.method === 'GET') return send(200, { policy: POL });
        if (url.pathname === '/api/policy' && req.method === 'PUT') { const b = await body(); setPolicy(db, b.policy); db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(Date.now(), user.name, 'set_policy', ''); return send(200, { ok: true }); }
        return send(404, { error: 'not found' });
      }
      if (url.pathname === '/api/pull' && req.method === 'GET') return send(200, pull(user, +url.searchParams.get('since') || 0));
      if (url.pathname === '/api/push' && req.method === 'POST') {
        let size = 0; const chunks = []; for await (const ch of req) { size += ch.length; if (size > maxBody) return send(413, { error: 'too large' }); chunks.push(ch); }
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        return send(200, push(user, body.changes || []));
      }
      return send(404, { error: 'not found' });
    } catch (e) { return send(500, { error: String(e.message || e) }); }
  };
}

if (import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href) {
  const file = process.env.NAWA_DB || './nawa-data.sqlite', port = +process.env.PORT || 8787;
  const db = openDb(file);
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) { const t = addUser(db, 'admin', 'admin'), pw = genPassword(); setPassword(db, 'admin', pw, 1); console.log('\n=== أول تشغيل (يظهر مرة واحدة فقط) ===\nاسم المستخدم: admin\nكلمة المرور المؤقتة: ' + pw + '\nرمز المدير (للمزامنة الآلية): ' + t + '\n'); }
  http.createServer(createApp(db, { staticFile: process.env.NAWA_APP || path.resolve('dist/index.html') })).listen(port, () => console.log('Nawa sync server on :' + port));
}
