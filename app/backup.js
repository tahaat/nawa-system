// نسخ احتياطي لقاعدة Cloudflare إلى ملف JSON: تنزيل يدوي + حفظ تلقائي يوميًا في مجلد (مثل مجلد OneDrive) على جهاز المدير
import { labeler } from '../core/restore.js';
import { saveBkHandle, getBkHandle, kvGet, kvSet } from './store.js';
let C, RS = null; const KEEP = 30, DAY = 20 * 3600e3;
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
  <p class="small">آخر نسخة من هذا الجهاز: ${last ? new Date(last).toLocaleString('ar') : '—'}.</p></div>
  <div class="card" id="rscard"><h2>استعادة من نسخة احتياطية</h2>${rsHtml()}</div>`;
}
const AR = { projects: 'المشاريع', centers: 'المراكز', beneficiaries: 'المستفيدون', sessions: 'الجلسات', enrollments: 'الانتساب', surveyResponses: 'ردود الاستبيانات', sheets: 'كشوف الحضور', ops: 'الإنجاز التشغيلي' };
const LIM = 300;
function rsList() {
  if (!RS?.res?.preview || !RS.res.items?.length) return '';
  const q = (RS.q || '').trim().toLowerCase(), by = {};
  for (const it of RS.res.items) { const k = it.coll + '|' + it.id, lab = RS.lab(RS.map.get(k) || it); if (q && !lab.toLowerCase().includes(q)) continue; (by[it.coll] ||= []).push({ ...it, k, lab }); }
  const body = Object.entries(by).map(([c, a]) => { const on = a.filter((x) => RS.sel.has(x.k)).length; return `<details open><summary><b>${AR[c] || c}</b> — ${a.length} <span class="small">(محدد ${on})</span> <button type="button" class="sec" data-act="rsAll" data-c="${c}" data-v="1">تحديد الكل</button> <button type="button" class="sec" data-act="rsAll" data-c="${c}" data-v="0">إلغاء الكل</button></summary><div class="tw"><table>${a.slice(0, LIM).map((x) => `<tr><td style="width:28px"><input type="checkbox" data-rsi="${esc(x.k)}" ${RS.sel.has(x.k) ? 'checked' : ''}></td><td>${esc(x.lab || x.id)}</td><td><span class="badge">${KIND[x.kind] || x.kind}</span></td></tr>`).join('')}</table></div>${a.length > LIM ? `<p class="small">يُعرض أول ${LIM} — استخدم البحث لتضييق القائمة.</p>` : ''}</details>`; }).join('') || '<p class="small">لا نتائج مطابقة للبحث.</p>';
  return `<h3>اختر السجلات المراد استعادتها</h3><div class="row"><input id="rsq" placeholder="بحث بالاسم / التاريخ / المركز…" value="${esc(RS.q || '')}"><span class="small" id="rsn">المحدد: <b>${RS.sel.size}</b> من ${RS.res.items.length}</span></div><div id="rslist">${body}</div>`;
}
const KIND = { missing: 'مفقود (يُضاف)', revive: 'محذوف (يُسترجع)', newer: 'نسخته أحدث (يُحدَّث)', skip: 'سليم (لا يتغير)' };
function rsHtml() {
  if (!RS) return `<p class="small">تعيد هذه الأداة ما <b>حُذف أو فُقد</b> فقط دون المساس بالبيانات الموجودة. اختر ملف نسخة احتياطية (naseej-backup-….json) ثم عاين النتيجة قبل التطبيق.</p><div class="row"><input type="file" id="rsfile" accept=".json,application/json"></div>`;
  const colls = Object.keys(RS.counts), ps = [...new Set(RS.recs.map((r) => r.project).filter(Boolean))];
  const pn = (id) => C.db?.projects?.find((p) => p.id === id)?.name || id;
  const res = RS.res ? `<h3>${RS.res.preview ? 'معاينة (لم يتغير شيء بعد)' : 'تمت الاستعادة'}</h3>${RS.res.applied != null ? `<p><span class="badge b-ok">أُعيد ${RS.res.applied} سجلًا</span> — أُرسلت إلى الأجهزة عند مزامنتها.</p>` : ''}<div class="tw"><table><tr><th>المجموعة</th>${Object.keys(KIND).map((k) => `<th>${KIND[k]}</th>`).join('')}</tr>${Object.entries(RS.res.counts).map(([c, n]) => `<tr><td>${AR[c] || c}</td>${Object.keys(KIND).map((k) => `<td>${n[k] || 0}</td>`).join('')}</tr>`).join('')}</table></div>${RS.res.preview ? `<p>إجمالي ما سيُعاد: <b>${RS.res.total}</b></p>` : ''}${rsList()}` : '';
  return `<p class="small">الملف: <b>${esc(RS.name)}</b> — بتاريخ ${esc(RS.at || '؟')} — ${RS.recs.length} سجلًا.</p>
  <div class="row"><label>الوضع<select id="rsmode"><option value="missing" ${RS.mode === 'missing' ? 'selected' : ''}>المحذوف والمفقود فقط (الأكثر أمانًا)</option><option value="newer" ${RS.mode === 'newer' ? 'selected' : ''}>+ ما نسخته أحدث من الموجود</option></select></label>
  <label>المشروع<select id="rsproj"><option value="">الكل</option>${ps.map((p) => `<option value="${esc(p)}" ${RS.project === p ? 'selected' : ''}>${esc(pn(p))}</option>`).join('')}</select></label>
  <label>من تاريخ<input type="date" id="rssince" value="${esc(RS.since || '')}"></label></div>
  <div class="row"><span class="small">المجموعات:</span>${colls.map((c) => `<label style="flex-direction:row;align-items:center;gap:4px;color:inherit"><input type="checkbox" data-rsc="${c}" ${RS.colls.has(c) ? 'checked' : ''}> ${AR[c] || c} (${RS.counts[c]})</label>`).join('')}</div>
  <div class="row"><button class="gold" data-act="rsPreview">معاينة</button><button data-act="rsApply" ${RS.res?.preview && RS.res.total && RS.sel.size ? '' : 'disabled'}>تطبيق الاستعادة</button><button class="sec" data-act="rsReset">اختيار ملف آخر</button></div>${res}`;
}
const rsRead = () => { if (!RS) return; RS.mode = document.getElementById('rsmode')?.value || 'missing'; RS.project = document.getElementById('rsproj')?.value || ''; RS.since = document.getElementById('rssince')?.value || ''; RS.colls = new Set([...document.querySelectorAll('[data-rsc]:checked')].map((e) => e.dataset.rsc)); };
const rsBody = (apply) => ({ backup: RS.raw, ids: apply ? [...RS.sel] : undefined, mode: RS.mode, colls: [...RS.colls], project: RS.project || undefined, since: RS.since || undefined, apply });
const rsPaint = () => { const e = document.getElementById('rscard'); if (e) e.innerHTML = '<h2>استعادة من نسخة احتياطية</h2>' + rsHtml(); };
export function wireBackup() {
  document.addEventListener('change', (e) => { const k = e.target?.dataset?.rsi; if (k == null || !RS) return; e.target.checked ? RS.sel.add(k) : RS.sel.delete(k); const n = document.getElementById('rsn'); if (n) n.innerHTML = `المحدد: <b>${RS.sel.size}</b> من ${RS.res.items.length}`; const b = document.querySelector('[data-act=rsApply]'); if (b) b.disabled = !RS.sel.size; });
  document.addEventListener('input', (e) => { if (e.target.id !== 'rsq' || !RS) return; RS.q = e.target.value; const l = document.getElementById('rslist'); if (l) { const t = document.createElement('div'); t.innerHTML = rsList(); l.innerHTML = t.querySelector('#rslist').innerHTML; } });
  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'rsfile') return; const f = e.target.files[0]; if (!f) return;
    try { const raw = JSON.parse(await f.text()); if (raw.app !== 'naseej' || !Array.isArray(raw.tables?.records)) throw new Error('bad'); const recs = raw.tables.records.filter((r) => !r.deleted), counts = {}; for (const r of recs) counts[r.coll] = (counts[r.coll] || 0) + 1;
      RS = { raw, recs, counts, name: f.name, at: raw.at, mode: 'missing', project: '', since: '', colls: new Set(Object.keys(counts)), res: null, q: '', sel: new Set(), lab: labeler(raw.tables.records), map: new Map(raw.tables.records.map((r) => [r.coll + '|' + r.id, r])) }; rsPaint(); }
    catch { C.toast('الملف ليس نسخة احتياطية صالحة من «نسيج»'); }
  });
}
export const backupActions = () => ({
  async rsPreview() { rsRead(); try { RS.res = await C.capi('/api/restore', 'POST', rsBody(false)); } catch (e) { return C.toast('تعذّرت المعاينة: ' + e.message); } RS.sel = new Set((RS.res.items || []).map((i) => i.coll + '|' + i.id)); RS.q = ''; rsPaint(); },
  rsAll(el) { const c = el.dataset.c, v = el.dataset.v === '1'; for (const it of RS.res.items) if (it.coll === c) v ? RS.sel.add(it.coll + '|' + it.id) : RS.sel.delete(it.coll + '|' + it.id); rsPaint(); },
  async rsApply() {
    if (!RS?.res?.total || !RS.sel.size) return; if (!(await C.ask(`ستُعاد ${RS.sel.size} سجلًا من نسخة ${RS.at || ''} (الموجود السليم لا يتغير). متابعة؟`))) return;
    try { RS.res = await C.capi('/api/restore', 'POST', rsBody(true)); } catch (e) { return C.toast('تعذّرت الاستعادة: ' + e.message); } rsPaint(); C.toast('تمت الاستعادة'); C.doSync?.();
  },
  rsReset() { RS = null; rsPaint(); },
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
