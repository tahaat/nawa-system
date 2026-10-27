// نسخ احتياطي لقاعدة Cloudflare إلى ملف JSON: تنزيل يدوي + حفظ تلقائي يوميًا في مجلد (مثل مجلد OneDrive) على جهاز المدير
import { saveBkHandle, getBkHandle, kvGet, kvSet } from './store.js';
let C; const KEEP = 30, DAY = 20 * 3600e3;
export const initBackup = (c) => { C = c; };
const isAdmin = () => !!C.me()?.policy?.manageUsers && !!C.sync.cfg.access;
const stamp = (d = new Date()) => d.toISOString().slice(0, 10);
const name = () => `naseej-backup-${stamp()}.json`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function fetchBackup() { const b = await C.capi('/api/backup'); return { b, text: JSON.stringify(b) }; }
async function perm(h, ask) { try { const o = { mode: 'readwrite' }; let p = await h.queryPermission(o); if (p !== 'granted' && ask) p = await h.requestPermission(o); return p; } catch { return 'denied'; } }
async function writeTo(h, text) {
  const f = await h.getFileHandle(name(), { create: true }), w = await f.createWritable(); await w.write(text); await w.close();
  const names = []; for await (const [n] of h.entries()) if (/^naseej-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n)) names.push(n);
  for (const n of names.sort().slice(0, Math.max(0, names.length - KEEP))) { try { await h.removeEntry(n); } catch { /* بلا صلاحية حذف */ } }
}
export async function autoBackup() {
  if (!isAdmin()) return; const h = await getBkHandle(); if (!h) return;
  const last = (await kvGet('bkLast')) || 0; if (Date.now() - last < DAY) return;
  if ((await perm(h, false)) !== 'granted') { if (Date.now() - last > 2 * 864e5) C.toast('النسخة الاحتياطية متأخرة — افتح «السحابة والمزامنة» واضغط «حفظ نسخة الآن»'); return; }
  try { const { text } = await fetchBackup(); await writeTo(h, text); await kvSet('bkLast', Date.now()); C.toast('حُفظت نسخة احتياطية في المجلد'); } catch (e) { console.warn('backup', e.message); }
}
export async function backupCard() {
  if (!isAdmin()) return ''; const h = await getBkHandle(), last = await kvGet('bkLast'), ok = h ? (await perm(h, false)) === 'granted' : false;
  return `<div class="card" id="bkcard"><h2>النسخ الاحتياطي</h2><p class="small">قاعدة البيانات على Cloudflare بلا نسخة خارجية. اختر مجلدًا داخل OneDrive لتُحفظ فيه نسخة كل يوم تلقائيًا عند فتح النظام من هذا الجهاز (متصفح Chrome/Edge)، ويُحتفظ بآخر ${KEEP} نسخة.</p>
  <div class="row"><button data-act="bkFolder" ${window.showDirectoryPicker ? '' : 'disabled'}>${h ? 'تغيير مجلد النسخ' : 'اختيار مجلد النسخ الاحتياطي'}</button><button class="gold" data-act="bkNow">حفظ نسخة الآن</button><button class="sec" data-act="bkDl">تنزيل ملف النسخة</button></div>
  <p>${h ? `المجلد: <b>${esc(h.name)}</b> — ${ok ? '<span class="badge b-ok">الصلاحية مفعّلة</span>' : '<span class="badge b-warn">تحتاج تأكيدًا (اضغط «حفظ نسخة الآن»)</span>'}` : 'لم يُختر مجلد بعد.'}</p>
  <p class="small">آخر نسخة من هذا الجهاز: ${last ? new Date(last).toLocaleString('ar') : '—'}. للاستعادة: <code>node scripts/backup-to-sql.mjs ملف.json</code> ثم تنفيذ الملف الناتج على D1.</p></div>`;
}
export const backupActions = () => ({
  async bkFolder() { try { const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'naseejbk' }); await saveBkHandle(h); C.toast('اختير المجلد'); } catch { return; } C.go('cloud'); },
  async bkNow() {
    try { const { b, text } = await fetchBackup(); const h = await getBkHandle(); let saved = false;
      if (h && (await perm(h, true)) === 'granted') { await writeTo(h, text); await kvSet('bkLast', Date.now()); saved = true; }
      if (!saved) C.dl(new Blob([text], { type: 'application/json' }), name(), 'application/json');
      C.toast(saved ? `حُفظت النسخة في المجلد (${b.counts.records} سجل)` : 'لم يُختر مجلد: نُزّلت النسخة كملف');
    } catch (e) { C.toast('تعذّر النسخ: ' + e.message); } C.go('cloud');
  },
  async bkDl() { try { const { text } = await fetchBackup(); C.dl(new Blob([text], { type: 'application/json' }), name(), 'application/json'); } catch (e) { C.toast('تعذّر النسخ: ' + e.message); } },
});
