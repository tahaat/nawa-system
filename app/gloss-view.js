// شاشة «الترجمة»: قاموس مخزَّن قابل للتعديل + ترجمة الناقص عبر الإنترنت + تصدير/استيراد
import { pager } from './pager.js';
import { gl, PROVIDERS, setEntry, delEntry, setOptions, missingList, stats, translateOnline, glossJSON, glossXLSX, importGlossary } from './glossary.js';
import { builtinPairs, getLang } from './i18n.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx; const st = { q: '', f: 'all', n: 150 };
export function initGloss(c) { ctx = c; window.addEventListener('nawa:gloss', () => { if (document.querySelector('#gloss')) vGloss(); }); }
export function vGloss() {
  const S = stats(), miss = missingList(), q = st.q.trim();
  const user = gl.entries.map((e) => ({ ...e })), uset = new Set(user.map((e) => e.ar));
  let rows = [...user, ...[...builtinPairs()].filter(([a]) => !uset.has(a)).map(([ar, en]) => ({ ar, en, src: 'builtin' }))];
  if (st.f !== 'all') rows = rows.filter((r) => r.src === st.f);
  if (q) rows = rows.filter((r) => r.ar.includes(q) || r.en.toLowerCase().includes(q.toLowerCase()));
  const GP = pager('gloss', rows.length, vGloss, st.q + '|' + st.f), shown = GP.slice(rows), B = { user: ['b-ok', 'مخصص'], online: ['b-warn', 'إنترنت'], builtin: ['', 'مدمج'] };
  ctx.view().innerHTML = `<div class="card" id="gloss"><h2>الترجمة</h2>
   <p class="small">عند التبديل إلى English يُترجَم كل نص من القاموس المخزّن أولًا (ترجماتك ثم المدمجة)، وما لا يوجد فيه يُجمَّع في «نصوص ناقصة» ويمكن ترجمته عبر الإنترنت وحفظه فيعمل بعدها بلا اتصال. لا يُرسَل أي اسم مستفيد أو مستخدم أو رقم هاتف إلى الإنترنت؛ تُرسَل فقط نصوص الواجهة وأسماء المشاريع والمراكز.</p>
   <div class="row"><span class="badge b-ok">مدمج ${S.builtin}</span><span class="badge b-ok">مخصص ${S.user}</span><span class="badge b-warn">من الإنترنت ${S.online}</span><span class="badge ${S.missing ? 'b-error' : 'b-ok'}">ناقص ${S.missing}</span><span class="badge ${navigator.onLine ? 'b-ok' : 'b-error'}">${navigator.onLine ? 'متصل' : 'غير متصل'}</span></div>
   <div class="row" style="margin-top:.6rem"><label class="chk"><input type="checkbox" id="gAuto" ${gl.auto ? 'checked' : ''}> ترجمة النصوص الناقصة تلقائيًا عبر الإنترنت عند التبديل إلى English</label>
   <label>المزوّد<select id="gProv">${Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}" ${k === gl.provider ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label></div>
   <div class="row" style="margin-top:.6rem"><button data-act="gTrNow" ${gl.busy ? 'disabled' : ''}>ترجمة الناقص الآن عبر الإنترنت</button><button class="sec" data-act="gXls">تصدير مخصصاتي (Excel)</button><button class="sec" data-act="gXlsAll">تصدير الكل (Excel)</button><button class="sec" data-act="gJson">تصدير JSON</button>
   <label>استيراد<input type="file" id="gfile" accept=".xlsx,.json,.csv,.tsv"></label><button class="sec" data-act="gImp">استيراد وإضافة</button></div><p id="gmsg" class="small"></p></div>
  ${miss.length ? `<div class="card"><h2>نصوص ناقصة (${miss.length})</h2><p class="small">نصوص ظهرت في واجهة English بلا ترجمة. اكتب ترجمتها أو اتركها لزر الإنترنت.</p><table><tr><th>العربية</th><th>English</th><th></th></tr>${miss.slice(0, 60).map((a) => `<tr><td data-notr>${esc(a)}</td><td><input class="gen" data-ar="${esc(a)}" dir="ltr" placeholder="…"></td><td><button class="sec" data-act="gOne" data-ar="${esc(a)}">ترجم</button></td></tr>`).join('')}</table></div>`
    : `<div class="card"><h2>نصوص ناقصة</h2><p class="small">${getLang() === 'en' ? 'لا نصوص ناقصة في ما عُرض حتى الآن. تنقّل بين الشاشات لتجميع المزيد.' : 'تُجمَّع النصوص الناقصة أثناء استخدام البرنامج بالإنجليزية. بدّل اللغة وتنقّل بين الشاشات ثم عُد هنا.'}</p></div>`}
  <div class="card"><h2>القاموس</h2><div class="row"><label>بحث<input id="gq" value="${esc(st.q)}" placeholder="عربي أو English"></label><label>عرض<select id="gf">${[['all', 'الكل'], ['user', 'مخصص'], ['online', 'من الإنترنت'], ['builtin', 'مدمج']].map(([k, v]) => `<option value="${k}" ${st.f === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>إضافة<input id="gnew" placeholder="العربية"></label><label>&nbsp;<input id="gnewen" dir="ltr" placeholder="English"></label><button data-act="gAdd">إضافة</button></div>
   <p class="small">${rows.length} نتيجة</p>${GP.html()}
   <table><tr><th>العربية</th><th>English</th><th>المصدر</th><th></th></tr>${shown.map((r) => `<tr><td data-notr>${esc(r.ar)}</td><td><input class="gen" data-ar="${esc(r.ar)}" dir="ltr" value="${esc(r.en)}"></td><td><span class="badge ${B[r.src][0]}">${B[r.src][1]}</span></td><td>${r.src === 'builtin' ? '' : `<button class="sec" data-act="gDel" data-ar="${esc(r.ar)}">حذف</button>`}</td></tr>`).join('')}</table>
   ${GP.html()}</div>`;
}
export function glossActions({ toast, dl }) {
  const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const msg = (m) => { const e = $('#gmsg'); if (e) e.textContent = m; toast(m); };
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'gAuto') setOptions({ auto: t.checked }); else if (t.id === 'gProv') setOptions({ provider: t.value });
    else if (t.id === 'gf') { st.f = t.value; vGloss(); }
    else if (t.classList?.contains('gen') && t.closest('#view')) { setEntry(t.dataset.ar, t.value, 'user'); }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'gq') { st.q = e.target.value; clearTimeout(vGloss.t); vGloss.t = setTimeout(() => { vGloss(); const q = $('#gq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); } });
  return {
    async gTrNow() { const n = missingList().length; if (!n) return toast('لا نصوص ناقصة'); if (!navigator.onLine) return toast('لا يوجد اتصال بالإنترنت'); toast('جارٍ الترجمة…'); const r = await translateOnline(); vGloss(); msg(`تُرجم ${r.ok}${r.fail ? ` وتعذّر ${r.fail}` : ''} وحُفظت في القاموس`); },
    async gOne(t) { if (!navigator.onLine) return toast('لا يوجد اتصال بالإنترنت'); const r = await translateOnline([t.dataset.ar]); toast(r.ok ? 'تُرجم وحُفظ' : 'تعذّرت الترجمة'); vGloss(); },
    gAdd() { const a = $('#gnew').value, b = $('#gnewen').value; if (!a.trim() || !b.trim()) return toast('اكتب العربية والإنجليزية'); setEntry(a, b, 'user'); vGloss(); },
    async gDel(t) { if (!(await ctx.ask('حذف هذه الترجمة المخصصة؟'))) return; delEntry(t.dataset.ar); vGloss(); },
    gMore() { st.n += 150; vGloss(); },
    async gXls() { dl(await glossXLSX(false), 'nawa-translation-custom.xlsx', XL); },
    async gXlsAll() { dl(await glossXLSX(true), 'nawa-translation-all.xlsx', XL); },
    gJson() { dl(glossJSON(), 'nawa-translation.json', 'application/json'); },
    async gImp() { const f = $('#gfile').files[0]; if (!f) return toast('اختر ملفًا'); try { const r = await importGlossary(f); vGloss(); msg(`أُضيف ${r.add} وحُدّث ${r.upd}`); } catch (err) { toast('ملف غير صالح: ' + err.message); } },
  };
}
