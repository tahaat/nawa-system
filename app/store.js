import Dexie from 'dexie';
import { newDb } from '../core/model.js';
const kv = new Dexie('nawa-system'); kv.version(1).stores({ kv: 'key' });
export const db = newDb(); export const ui = { projectId: null };
let timer;
export async function load() {
  try { const rows = await kv.kv.toArray(); for (const r of rows) { if (r.key === 'ui') Object.assign(ui, r.value); else if (db[r.key]) db[r.key] = r.value; } } catch (e) { console.warn('storage', e); }
  if (!db.projects.find((p) => p.id === ui.projectId)) ui.projectId = db.projects[0]?.id || null;
}
export function save() { clearTimeout(timer); timer = setTimeout(async () => { try { await kv.transaction('rw', kv.kv, async () => { for (const k of Object.keys(db)) await kv.kv.put({ key: k, value: JSON.parse(JSON.stringify(db[k])) }); await kv.kv.put({ key: 'ui', value: { ...ui } }); }); } catch (e) { console.warn(e); } }, 250); }
export const backupJSON = () => JSON.stringify({ app: 'nawa', v: 1, at: new Date().toISOString(), db }, null, 1);
export function restoreJSON(t) { const j = JSON.parse(t); if (j.app !== 'nawa') throw new Error('ملف نسخة احتياطية غير صالح'); for (const k of Object.keys(db)) db[k] = j.db[k] || []; ui.projectId = db.projects[0]?.id || null; save(); }
export const project = () => db.projects.find((p) => p.id === ui.projectId);
