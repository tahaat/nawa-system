// Worker «نَسيج»: المزامنة والصلاحيات على D1 خلف Cloudflare Access.
// الهوية تأتي من رمز Access (JWT) الموقَّع؛ لا كلمات مرور ولا رموز جلسات عندنا.
import { COLLS, DEFAULT_POLICY, projectOf, centerOf, activeAssign, userCenters, userProjects, inScope, stripHidden } from '../core/server-policy.js';

const json = (obj, code = 200, h = {}) => new Response(JSON.stringify(obj), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
const PUSH_MAX = 40, PULL_LIMIT = 300;

// ===== التحقق من رمز Access =====
let certs = { at: 0, keys: null };
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function accessEmail(req, env) {
  if (env.DEV_EMAIL) return String(req.headers.get('x-dev-email') || env.DEV_EMAIL).toLowerCase(); // للتطوير المحلي فقط (.dev.vars)، لا يُضبط في الإنتاج
  const t = req.headers.get('cf-access-jwt-assertion'); if (!t || !env.TEAM_DOMAIN || !env.POLICY_AUD) return null;
  const [h, p, s] = t.split('.'); if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), pay = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (Date.now() - certs.at > 3600e3 || !certs.keys?.some((k) => k.kid === head.kid)) { const r = await fetch(`https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`); if (!r.ok) return null; certs = { at: Date.now(), keys: (await r.json()).keys }; }
  const jwk = certs.keys.find((k) => k.kid === head.kid); if (!jwk || head.alg !== 'RS256') return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p)))) return null;
  const aud = [].concat(pay.aud || []);
  if (!aud.includes(env.POLICY_AUD) || pay.iss !== `https://${env.TEAM_DOMAIN}` || (pay.exp || 0) * 1000 < Date.now()) return null;
  return String(pay.email || '').toLowerCase() || null;
}

// ===== D1 =====
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
const one = (env, sql, ...a) => q(env, sql, ...a).first();
const all = async (env, sql, ...a) => (await q(env, sql, ...a).all()).results;
const run = (env, sql, ...a) => q(env, sql, ...a).run();
const aud = (env, user, action, detail) => run(env, 'INSERT INTO audit VALUES(?,?,?,?)', Date.now(), user, action, detail);
const getPolicy = async (env) => { const r = await one(env, "SELECT v FROM policy WHERE k='roles'"); return r ? { ...DEFAULT_POLICY, ...JSON.parse(r.v), admin: DEFAULT_POLICY.admin } : DEFAULT_POLICY; };
const curSeq = async (env) => (await one(env, "SELECT v FROM meta WHERE k='seq'"))?.v || 0;
const jp = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const inList = (n) => Array(n).fill('?').join(',');

async function fetchRecs(env, coll, ids) { // جلب سجلات متعددة بأقل عدد من الاستعلامات
  const out = new Map();
  for (let i = 0; i < ids.length; i += 90) { const part = ids.slice(i, i + 90); for (const r of await all(env, `SELECT * FROM records WHERE coll=? AND id IN (${inList(part.length)})`, coll, ...part)) out.set(r.id, r); }
  return out;
}

async function push(env, user, changes) {
  if (changes.length > PUSH_MAX) throw Object.assign(new Error('too many'), { code: 413 });
  const pol = (await getPolicy(env))[user.role] || { read: {}, write: {} }, results = [], rejected = [], forbidden = [], plan = [];
  const byColl = {}; for (const c of changes) if (COLLS.includes(c.coll) && c.id) (byColl[c.coll] ||= []).push(c.id);
  const have = {}; for (const [c, ids] of Object.entries(byColl)) have[c] = await fetchRecs(env, c, ids);
  for (const c of changes) {
    if (!COLLS.includes(c.coll) || !c.id) { results.push({ coll: c.coll, id: c.id, error: 'bad' }); continue; }
    const ex = have[c.coll].get(c.id), w = pol.write?.[c.coll];
    const fb = () => { const vis = ex && !ex.deleted && inScope(pol.read?.[c.coll], ex.center, ex.project, user); forbidden.push({ coll: c.coll, id: c.id, server: vis ? stripHidden(c.coll, JSON.parse(ex.data), pol) : null, seq: ex?.seq || 0 }); };
    if (!w) { fb(); continue; }
    const center = centerOf(c.coll, c.data) ?? ex?.center ?? null, project = projectOf(c.coll, c.data) ?? ex?.project ?? null, exists = !!ex && !ex.deleted;
    if (!inScope(w, center, project, user, exists) || (exists && (w === 'own' || w === 'proj') && !inScope(w, ex.center, ex.project, user))) { fb(); continue; }
    if (c.data && pol.hidden?.[c.coll] && ex && !ex.deleted) { const old = JSON.parse(ex.data); c.data = { ...c.data }; for (const f of pol.hidden[c.coll]) { if (f in old) c.data[f] = old[f]; else delete c.data[f]; } }
    if (ex && ex.seq > (c.baseSeq || 0) && ex.ts > c.ts) { rejected.push({ coll: c.coll, id: c.id }); continue; }
    plan.push({ c, center, project, existed: !!ex });
  }
  let seq = await curSeq(env);
  if (plan.length) {
    const end = (await one(env, "UPDATE meta SET v=v+? WHERE k='seq' RETURNING v", plan.length)).v; seq = end - plan.length;
    const stmts = plan.map(({ c, center, project }, i) => q(env, 'INSERT OR REPLACE INTO records(coll,id,data,ts,deleted,seq,by_user,center,project) VALUES(?,?,?,?,?,?,?,?,?)', c.coll, c.id, c.data == null ? null : JSON.stringify(c.data), c.ts, c.data == null ? 1 : 0, seq + i + 1, user.name, center, project));
    plan.forEach(({ c }, i) => results.push({ coll: c.coll, id: c.id, seq: seq + i + 1 }));
    stmts.push(q(env, 'INSERT INTO audit VALUES(?,?,?,?)', Date.now(), user.name, 'push', `${results.length} ok, ${rejected.length} rejected, ${forbidden.length} forbidden`));
    await env.DB.batch(stmts); seq = end;
  }
  return { results, rejected, forbidden, seq };
}

async function pull(env, user, since) {
  const pol = (await getPolicy(env))[user.role] || { read: {} };
  const rows = await all(env, 'SELECT coll,id,data,ts,deleted,seq,center,project FROM records WHERE seq>? ORDER BY seq LIMIT ?', since, PULL_LIMIT);
  let enr = null;
  if (pol.read?.beneficiaries === 'enr') {
    enr = new Set(); const ps = userProjects(user);
    if (ps.length) for (const r of await all(env, `SELECT data FROM records WHERE coll='enrollments' AND deleted=0 AND project IN (${inList(ps.length)})`, ...ps)) { const d = jp(r.data, {}); if (d.status !== 'ended' && d.beneficiaryId) enr.add(d.beneficiaryId); }
  }
  const vis = rows.filter((r) => (r.coll === 'beneficiaries' && enr ? enr.has(r.id) : inScope(pol.read?.[r.coll], r.center, r.project, user)));
  if (enr) {
    const have = new Set(vis.filter((r) => r.coll === 'beneficiaries').map((r) => r.id)), need = [];
    for (const r of vis) { if (r.coll !== 'enrollments' || r.deleted) continue; const d = jp(r.data, {}); if (d.beneficiaryId && !have.has(d.beneficiaryId) && d.status !== 'ended' && enr.has(d.beneficiaryId)) { have.add(d.beneficiaryId); need.push(d.beneficiaryId); } }
    if (need.length) for (const b of (await fetchRecs(env, 'beneficiaries', need)).values()) if (!b.deleted) vis.push(b);
  }
  const seq = await curSeq(env), more = rows.length === PULL_LIMIT;
  return { records: vis.map((r) => ({ coll: r.coll, id: r.id, data: r.deleted ? null : stripHidden(r.coll, JSON.parse(r.data), pol), ts: r.ts, seq: r.seq })), seq, next: rows.length ? rows[rows.length - 1].seq : since, more };
}

const cleanAs = (a) => (Array.isArray(a) ? a : []).slice(0, 40).map((x) => ({ project: String(x.project || '').slice(0, 60), center: String(x.center || '').slice(0, 60), from: /^\d{4}-\d{2}-\d{2}$/.test(x.from || '') ? x.from : '', to: /^\d{4}-\d{2}-\d{2}$/.test(x.to || '') ? x.to : '' })).filter((x) => x.project || x.center);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let titleCol = false;
async function ensureTitle(env) { if (titleCol) return; try { await env.DB.prepare('ALTER TABLE users ADD COLUMN title TEXT').run(); } catch { /* العمود موجود */ } titleCol = true; }

async function api(req, env, url) {
  if (url.pathname === '/api/health') return json({ ok: true });
  await ensureTitle(env);
  const email = await accessEmail(req, env);
  if (!email) return json({ error: 'unauthorized' }, 401);
  let user = await one(env, 'SELECT * FROM users WHERE email=?', email);
  if (!user && env.ADMIN_EMAIL && String(env.ADMIN_EMAIL).toLowerCase().split(/[,;\s]+/).includes(email)) { await run(env, "INSERT INTO users(email,name,role,centers,assignments,active) VALUES(?,?, 'admin','[]','[]',1)", email, email.split('@')[0]); user = await one(env, 'SELECT * FROM users WHERE email=?', email); }
  if (!user || !user.active) return json({ error: 'not provisioned' }, 403);
  const POL = await getPolicy(env), mypol = POL[user.role] || {};
  const body = async () => { const t = await req.text(); if (t.length > 2e6) throw Object.assign(new Error('big'), { code: 413 }); return JSON.parse(t || '{}'); };
  try {
    const p = url.pathname, m = req.method;
    if (p === '/api/me') { await run(env, 'UPDATE users SET last_login=? WHERE email=?', Date.now(), email); return json({ name: user.name, label: user.name, title: user.title || '', email, access: true, role: user.role, centers: userCenters(user), projects: userProjects(user), assignments: activeAssign(user), mustChange: false, seq: await curSeq(env), policy: { routes: mypol.routes || [], manageUsers: !!mypol.manageUsers, read: mypol.read || {}, write: mypol.write || {}, hidden: mypol.hidden || {} } }); }
    if (p === '/api/logout') return json({ ok: true });
    if (p === '/api/pull' && m === 'GET') return json(await pull(env, user, +url.searchParams.get('since') || 0));
    if (p === '/api/push' && m === 'POST') return json(await push(env, user, (await body()).changes || []));
    if (p.startsWith('/api/users') || p === '/api/policy' || p.startsWith('/api/sessions') || p === '/api/audit') {
      if (!mypol.manageUsers) return json({ error: 'forbidden' }, 403);
      if (p === '/api/sessions') return json({ sessions: [] }); // الأجهزة والجلسات تديرها Access
      if (p === '/api/sessions/revoke') return json({ ok: true });
      if (p === '/api/users' && m === 'GET') return json({ users: (await all(env, 'SELECT email,name,title,role,centers,assignments,active,last_login FROM users')).map((u) => ({ ...u, name: u.email, label: u.name, centers: userCenters(u), rawCenters: jp(u.centers, []), assignments: jp(u.assignments, []), devices: 0 })) });
      if (p === '/api/users' && m === 'POST') { const b = await body(), em = String(b.email || b.name || '').trim().toLowerCase(); if (!EMAIL.test(em) || !POL[b.role]) return json({ error: 'bad' }, 400); if (await one(env, 'SELECT 1 x FROM users WHERE email=?', em)) return json({ error: 'exists' }, 409); await run(env, 'INSERT INTO users(email,name,title,role,centers,assignments,active) VALUES(?,?,?,?,?,?,1)', em, String(b.label || em.split('@')[0]).slice(0, 60), String(b.title || '').slice(0, 80), b.role, JSON.stringify(b.centers || []), JSON.stringify(cleanAs(b.assignments))); await aud(env, user.email, 'add_user', em + ':' + b.role); return json({ ok: true }); }
      if (p === '/api/users' && m === 'PUT') { const b = await body(), em = String(b.name || b.email || '').toLowerCase(), t = await one(env, 'SELECT * FROM users WHERE email=?', em); if (!t) return json({ error: 'none' }, 404); const st = []; if (b.role && POL[b.role] && !(t.email === user.email && b.role !== user.role)) st.push(q(env, 'UPDATE users SET role=? WHERE email=?', b.role, em)); if (typeof b.label === 'string' && b.label.trim()) st.push(q(env, 'UPDATE users SET name=? WHERE email=?', b.label.trim().slice(0, 60), em)); if (typeof b.title === 'string') st.push(q(env, 'UPDATE users SET title=? WHERE email=?', b.title.trim().slice(0, 80), em)); if (b.assignments) st.push(q(env, 'UPDATE users SET assignments=? WHERE email=?', JSON.stringify(cleanAs(b.assignments)), em)); if (b.centers) st.push(q(env, 'UPDATE users SET centers=? WHERE email=?', JSON.stringify(b.centers), em)); if (st.length) await env.DB.batch(st); await aud(env, user.email, 'edit_user', em + (b.role ? ' role=' + b.role : '') + (b.assignments ? ' assign' : '')); return json({ ok: true }); }
      if (p === '/api/users/disable' && m === 'POST') { const b = await body(), em = String(b.name || b.email || '').toLowerCase(); if (em === user.email) return json({ error: 'self' }, 400); await run(env, 'UPDATE users SET active=? WHERE email=?', b.active ? 1 : 0, em); await aud(env, user.email, b.active ? 'enable_user' : 'disable_user', em); return json({ ok: true }); }
      if (p === '/api/audit' && m === 'GET') { const u = url.searchParams.get('user'), n = Math.min(+url.searchParams.get('limit') || 200, 1000); return json({ rows: u ? await all(env, 'SELECT * FROM audit WHERE user=? ORDER BY at DESC LIMIT ?', u, n) : await all(env, 'SELECT * FROM audit ORDER BY at DESC LIMIT ?', n) }); }
      if (p === '/api/policy' && m === 'GET') return json({ policy: POL });
      if (p === '/api/policy' && m === 'PUT') { const b = await body(); await run(env, "INSERT OR REPLACE INTO policy VALUES('roles',?)", JSON.stringify(b.policy)); await aud(env, user.email, 'set_policy', ''); return json({ ok: true }); }
      return json({ error: 'not found' }, 404);
    }
    return json({ error: 'not found' }, 404);
  } catch (e) { return json({ error: String(e.message || e) }, e.code === 413 ? 413 : 500); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return api(req, env, url);
    const res = await env.ASSETS.fetch(req);
    if ((url.pathname === '/' || url.pathname === '/index.html') && (res.headers.get('content-type') || '').includes('text/html')) {
      return new HTMLRewriter().on('head', { element(e) { e.prepend('<meta name="nawa-server" content="1"><meta name="nawa-access" content="1">', { html: true }); } }).transform(new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), 'cache-control': 'no-cache' } }));
    }
    return res;
  },
};
