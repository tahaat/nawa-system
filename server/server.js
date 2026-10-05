// خادم المزامنة (Node 22+، بلا تبعيات): SQLite + HTTP. يُستضاف على سحابتك خلف HTTPS.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const COLLS = ['projects', 'centers', 'beneficiaries', 'sessions', 'enrollments', 'surveyResponses'];
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS records(coll TEXT, id TEXT, data TEXT, ts INTEGER, deleted INTEGER DEFAULT 0, seq INTEGER, by_user TEXT, PRIMARY KEY(coll,id));
   CREATE INDEX IF NOT EXISTS rec_seq ON records(seq);
   CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY, token_hash TEXT UNIQUE, role TEXT, centers TEXT, active INTEGER DEFAULT 1);
   CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v INTEGER);
   CREATE TABLE IF NOT EXISTS audit(at INTEGER, user TEXT, action TEXT, detail TEXT);
   INSERT OR IGNORE INTO meta VALUES('seq',0);`);
  return db;
}
export function addUser(db, name, role = 'entry', centers = []) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT OR REPLACE INTO users(name,token_hash,role,centers,active) VALUES(?,?,?,?,1)').run(name, sha(token), role, JSON.stringify(centers));
  return token;
}

export function createApp(db, { staticFile = null, maxBody = 20e6 } = {}) {
  const nextSeq = () => { db.prepare("UPDATE meta SET v=v+1 WHERE k='seq'").run(); return db.prepare("SELECT v FROM meta WHERE k='seq'").get().v; };
  const curSeq = () => db.prepare("SELECT v FROM meta WHERE k='seq'").get().v;
  const getRec = db.prepare('SELECT * FROM records WHERE coll=? AND id=?');
  const putRec = db.prepare('INSERT OR REPLACE INTO records(coll,id,data,ts,deleted,seq,by_user) VALUES(?,?,?,?,?,?,?)');

  function push(user, changes) {
    const results = [], rejected = [];
    db.exec('BEGIN');
    try {
      for (const c of changes) {
        if (!COLLS.includes(c.coll) || !c.id) { results.push({ coll: c.coll, id: c.id, error: 'bad' }); continue; }
        const ex = getRec.get(c.coll, c.id);
        if (ex && ex.seq > (c.baseSeq || 0) && ex.ts > c.ts) { rejected.push({ coll: c.coll, id: c.id }); continue; } // السيرفر أحدث ⇒ يفوز
        const seq = nextSeq();
        putRec.run(c.coll, c.id, c.data == null ? null : JSON.stringify(c.data), c.ts, c.data == null ? 1 : 0, seq, user.name);
        results.push({ coll: c.coll, id: c.id, seq });
      }
      db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(Date.now(), user.name, 'push', `${results.length} ok, ${rejected.length} rejected`);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return { results, rejected, seq: curSeq() };
  }
  function pull(user, since, limit = 1000) {
    const rows = db.prepare('SELECT coll,id,data,ts,deleted,seq FROM records WHERE seq>? ORDER BY seq LIMIT ?').all(since, limit);
    return { records: rows.map((r) => ({ coll: r.coll, id: r.id, data: r.deleted ? null : JSON.parse(r.data), ts: r.ts, seq: r.seq })), seq: curSeq(), more: rows.length === limit };
  }

  return async (req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    const send = (code, obj, h = {}) => { const b = typeof obj === 'string' ? obj : JSON.stringify(obj); res.writeHead(code, { 'content-type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json', ...cors, ...h }); res.end(b); };
    if (req.method === 'OPTIONS') return send(204, '');
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/' && staticFile && fs.existsSync(staticFile)) return send(200, fs.readFileSync(staticFile, 'utf8'));
    if (url.pathname === '/api/health') return send(200, { ok: true });
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = tok && db.prepare('SELECT * FROM users WHERE token_hash=? AND active=1').get(sha(tok));
    if (!user) return send(401, { error: 'unauthorized' });
    try {
      if (url.pathname === '/api/me') return send(200, { name: user.name, role: user.role, centers: JSON.parse(user.centers), seq: curSeq() });
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
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) { const t = addUser(db, 'admin', 'admin'); console.log('\n=== أول تشغيل: رمز المدير (يظهر مرة واحدة فقط) ===\n' + t + '\n'); }
  http.createServer(createApp(db, { staticFile: process.env.NAWA_APP || path.resolve('dist/index.html') })).listen(port, () => console.log('Nawa sync server on :' + port));
}
