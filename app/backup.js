// نسخ احتياطي لقاعدة Cloudflare إلى ملف JSON: تنزيل يدوي + حفظ تلقائي يوميًا في مجلد (مثل مجلد OneDrive) على جهاز المدير
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
const KIND = { missing: 'مفقود (يُضاف)', revive: 'محذوف (يُسترجع)', newer: 'نسخته أحدث (يُحدَّث)', skip: 'سليم (لا يتغير)' };
function rsHtml() {
  if (!RS) return `<p class="small">تعيد هذه الأداة ما <b>حُذف أو فُقد</b> فقط دون المساس بالبيانات الموجودة. اختر ملف نسخة احتياطية (naseej-backup-….json) ثم عاين النتيجة قبل التطبيق.</p><div class="row"><input type="file" id="rsfile" accept=".json,application/json"></div>`;
  const colls = Object.keys(RS.counts), ps = [...new Set(RS.recs.map((r) => r.project).filter(Boolean))];
  const pn = (id) => C.db?.projects?.find((p) => p.id === id)?.name || id;
  const res = RS.res ? `<h3>${RS.res.preview ? 'معاينة (لم يتغير شيء بعد)' : 'تمت الاستعادة'}</h3>${RS.res.applied != null ? `<p><span class="badge b-ok">أُعيد ${RS.res.applied} سجلًا</span> — أُرسلت إلى الأجهزة عند مزامنتها.</p>` : ''}<div class="tw"><table><tr><th>المجموعة</th>${Object.keys(KIND).map((k) => `<th>${KIND[k]}</th>`).join('')}</tr>${Object.entries(RS.res.counts).map(([c, n]) => `<tr><td>${AR[c] || c}</td>${Object.keys(KIND).map((k) => `<td>${n[k] || 0}</td>`).join('')}</tr>`).join('')}</table></div>${RS.res.preview ? `<p>إجمالي ما سيُعاد: <b>${RS.res.total}</b></p>` : ''}` : '';
  return `<p class="small">الملف: <b>${esc(RS.name)}</b> — بتاريخ ${esc(RS.at || '؟')} — ${RS.recs.length} سجلًا.</p>
  <div class="row"><label>الوضع<select id="rsmode"><option value="missing" ${RS.mode === 'missing' ? 'selected' : ''}>المحذوف والمفقود فقط (الأكثر أمانًا)</option><option value="newer" ${RS.mode === 'newer' ? 'selected' : ''}>+ ما نسخته أحدث من الموجود</option></select></label>
  <label>المشروع<select id="rsproj"><option value="">الكل</option>${ps.map((p) => `<option value="${esc(p)}" ${RS.project === p ? 'selected' : ''}>${esc(pn(p))}</option>`).join('')}</select></label>
  <label>من تاريخ<input type="date" id="rssince" value="${esc(RS.since || '')}"></label></div>
  <div class="row"><span class="small">المجموعات:</span>${colls.map((c) => `<label style="flex-direction:row;align-items:center;gap:4px;color:inherit"><input type="checkbox" data-rsc="${c}" ${RS.colls.has(c) ? 'checked' : ''}> ${AR[c] || c} (${RS.counts[c]})</label>`).join('')}</div>
  <div class="row"><button class="gold" data-act="rsPreview">معاينة</button><button data-act="rsApply" ${RS.res?.preview && RS.res.total ? '' : 'disabled'}>تطبيق الاستعادة</button><button class="sec" data-act="rsReset">اختيار ملف آخر</button></div>${res}`;
}
const rsRead = () => { if (!RS) return; RS.mode = document.getElementById('rsmode')?.value || 'missing'; RS.project = document.getElementById('rsproj')?.value || ''; RS.since = document.getElementById('rssince')?.value || ''; RS.colls = new Set([...document.querySelectorAll('[data-rsc]:checked')].map((e) => e.dataset.rsc)); };
const rsBody = (apply) => ({ backup: RS.raw, mode: RS.mode, colls: [...RS.colls], project: RS.project || undefined, since: RS.since || undefined, apply });
const rsPaint = () => { const e = document.getElementById('rscard'); if (e) e.innerHTML = '<h2>استعادة من نسخة احتياطية</h2>' + rsHtml(); };
export function wireBackup() {
  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'rsfile') return; const f = e.target.files[0]; if (!f) return;
    try { const raw = JSON.parse(await f.text()); if (raw.app !== 'naseej' || !Array.isArray(raw.tables?.records)) throw new Error('bad'); const recs = raw.tables.records.filter((r) => !r.deleted), counts = {}; for (const r of recs) counts[r.coll] = (counts[r.coll] || 0) + 1;
      RS = { raw, recs, counts, name: f.name, at: raw.at, mode: 'missing', project: '', since: '', colls: new Set(Object.keys(counts)), res: null }; rsPaint(); }
    catch { C.toast('الملف ليس نسخة احتياطية صالحة من «نسيج»'); }
  });
}
export const backupActions = () => ({
  async rsPreview() { rsRead(); try { RS.res = await C.capi('/api/restore', 'POST', rsBody(false)); } catch (e) { return C.toast('تعذّرت المعاينة: ' + e.message); } rsPaint(); },
  async rsApply() {
    if (!RS?.res?.total) return; rsRead(); if (!(await C.ask(`ستُعاد ${RS.res.total} سجلًا من نسخة ${RS.at || ''} (الموجود السليم لا يتغير). متابعة؟`))) return;
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
