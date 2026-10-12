// شاشة «الكشوفات»: نماذج إدخال مقيّدة تطابق كشوفات الحضور الورقية (Word). الأعداد تُحسب من القائمة ولا تُكتب يدوياً.
import { KINDS, SG, DTYPES, newSheet, validateSheet, derivedCounts, completion, commitSheet, removeSheet, peopleOf, nameOk, phoneOk, heldMeetings } from '../core/sheets.js';
import { ageAt, uid } from '../core/model.js';
import { putDraft, delDraft, getDraft, draftsCard } from './drafts.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx, cur = null, base = '', bound = false; const q = {}, showAll = {}, quick = {}, flt = {}, pick = {}, lim = {};

export function initSheets(c) { ctx = c; if (bound) return; bound = true; document.addEventListener('input', onInput); document.addEventListener('change', onInput); document.addEventListener('click', onClick); }
// شارات ملونة وغامقة بعلامة = لتمييز الذكور/الإناث/ذوي الإعاقة/بدون إعاقة بسهولة
const gc = (cls, label, n) => `<span class="gc ${cls}"><span>${label}</span> = <b>${n}</b></span>`;
export const countChips = (d) => `${gc('gm', 'ذ', d.M)}${gc('gf', 'إ', d.F)}${gc('gd', 'إعاقة', d.MWD + d.FWD)}${gc('gn', 'بلا إعاقة', d.total - d.MWD - d.FWD)}`;
const live = () => ctx.route() === 'sheets' && cur;
const setCur = (x, draft = false) => { cur = x; base = draft ? '__draft__' : JSON.stringify(x); };
const dId = () => 'sheet:' + cur.id;
const sheetTitle = (c) => `${KINDS[c.kind].name}${c.meta.title || (c.meta.activities || [])[0] || c.meta.type || c.meta.body ? ' — ' + (c.meta.title || (c.meta.activities || [])[0] || c.meta.type || c.meta.body) : ''}${c.meta.date || c.meta.start ? ' — ' + (c.meta.date || c.meta.start) : ''}`;
// حفظ الكشف الجاري كمسودة (إن تغيّر شيء). clear=true عند مغادرة الشاشة فيعود المستخدم لقائمة الكشوف والمسودات
export function sheetAuto(clear = false) {
  if (!cur) return false; const dirty = JSON.stringify(cur) !== base; let saved = false;
  if (dirty) { putDraft({ id: dId(), type: 'sheet', projectId: cur.projectId, title: sheetTitle(cur), data: cur }); saved = true; }
  if (clear) { cur = null; base = ''; } return saved;
}
export function restoreSheet(data) { setCur(JSON.parse(JSON.stringify(data)), true); }

// ---------- القائمة ----------
export function openSheet(id) { const x = ctx.db.sheets.find((s) => s.id === id); if (!x) return false; setCur(JSON.parse(JSON.stringify(x))); editor(); return true; }
export function vSheets() {
  const p = ctx.project(); if (!p) return ctx.empty();
  if (cur && cur.projectId !== p.id) cur = null;
  if (cur) return editor();
  const db = ctx.db, list = db.sheets.filter((s) => s.projectId === p.id).sort((a, b) => ((b.meta.date || b.meta.start || '')).localeCompare(a.meta.date || a.meta.start || ''));
  ctx.view().innerHTML = draftsCard(p.id, 'sheet') + `<div class="card"><h2>كشف حضور جديد</h2><p class="small">اختر نوع الكشف كما في الكشوف الورقية. كل ما يُكتب هنا يُفحص قبل الحفظ، ولا يُحفظ كشف فيه خطأ.</p>
    <div class="row">${Object.entries(KINDS).map(([k, K]) => `<button data-shact="new" data-k="${k}">${esc(K.name)}</button>`).join('')}</div></div>
  <div class="card"><h2>الكشوف المسجَّلة (${list.length})</h2>${list.length ? `<div class="tw"><table><tr><th>النوع</th><th>العنوان</th><th>التاريخ</th><th>المركز</th><th>الحضور</th><th>الحالة</th><th></th></tr>${list.map((s) => { const K = KINDS[s.kind], d = derivedCounts(s, db), v = validateSheet(s, db, { others: db.sessions.filter((x) => x.sheetId !== s.id) });
    return `<tr><td>${esc(K.name)}</td><td>${esc(s.meta.title || (s.meta.activities || [])[0] || s.meta.type || s.meta.body || '')}</td><td>${esc(K.multi ? `${s.meta.start || ''} → ${s.meta.end || ''}` : s.meta.date || '')}${K.multi ? `<br><span class="small">${heldMeetings(s).length} / ${s.meta.meetings || '؟'} لقاء</span>` : ''}</td><td>${esc(db.centers.find((c) => c.id === s.centerId)?.name || '')}</td><td><b>${d.total}</b><div class="gcs">${countChips(d)}</div></td><td>${v.errors.length ? `<span class="badge b-error" title="${esc(v.errors.join(' | '))}">${v.errors.length} خطأ</span>` : v.warnings.length ? `<span class="badge b-warn" title="${esc(v.warnings.join(' | '))}">${v.warnings.length} تنبيه</span>` : '<span class="badge b-ok">✔</span>'}</td><td><button class="sec" data-shact="edit" data-id="${s.id}">فتح</button> <button class="x" data-shact="del" data-id="${s.id}">حذف</button></td></tr>`; }).join('')}</table></div>` : '<p class="small">لا كشوف بعد.</p>'}</div>`;
}

// ---------- المحرر ----------
const fld = (f) => {
  const m = cur.meta, v = m[f.key] ?? '', req = f.req ? ' *' : '', L = `${esc(f.label)}${req}`;
  if (f.type === 'mode') return `<label>${L}<select data-sm="mode"><option value="inperson" ${m.mode !== 'online' ? 'selected' : ''}>وجاهي (مركز/قاعة)</option><option value="online" ${m.mode === 'online' ? 'selected' : ''}>إلكتروني (منصة)</option></select></label>
    <label><span id="sh-vl">${m.mode === 'online' ? 'المنصة (زوم/تيمز…) *' : 'مكان التنفيذ (القاعة) *'}</span><input data-sm="venue" value="${esc(m.venue)}" style="width:200px"></label>`;
  if (f.type === 'select') return `<label>${L}<select data-sm="${f.key}"><option value=""></option>${f.opts.map((o) => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  if (f.type === 'lines') return `<label>${L}<textarea data-sl="${f.key}" rows="2" style="width:230px" placeholder="كل اسم في سطر">${esc((m[f.key] || []).join('\n'))}</textarea></label>`;
  const ty = { date: 'date', time: 'time', number: 'number', int: 'number', tel: 'tel' }[f.type] || 'text';
  return `<label>${L}<input data-sm="${f.key}" data-t="${f.type}" type="${ty}" ${f.type === 'number' ? 'step="0.5"' : f.type === 'int' ? 'step="1"' : ''} ${f.min != null ? `min="${f.min}" max="${f.max}"` : ''} value="${esc(v)}" style="width:${ty === 'text' || ty === 'tel' ? 200 : 150}px"></label>`;
};
const eligible = (L, b) => { const gs = (cur.meta.groups || []).filter((k) => L.allowed.includes(k)).map((k) => SG[k]); if (!gs.length) return false; if (!L.age) return true; const a = ageAt(b, cur.meta.date || cur.meta.start || new Date().toISOString().slice(0, 10)); return a != null && gs.some((g) => a >= g.min && a <= g.max); };

function editor() {
  const K = KINDS[cur.kind], p = ctx.project(), db = ctx.db;
  ctx.view().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(K.name)}</h2><span class="row" style="gap:6px"><button class="sec" data-shact="draft" title="احفظ ما أنجزته الآن كمسودة وأكمله لاحقًا">حفظ كمسودة</button><button class="sec" data-shact="cancel">إغلاق دون حفظ</button></span></div>
    <p class="small">المشروع: <b>${esc(p.name)}</b> — الحقول المعلَّمة بـ * إلزامية.</p>
    <div class="row"><label>النشاط في المشروع *<select id="sh-act"><option value=""></option>${p.activities.filter((a) => !a.ops).map((a) => `<option value="${a.id}" ${a.id === cur.activityId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
    <label>المركز *<select id="sh-ctr"><option value=""></option>${ctx.myCenters().map((c) => `<option value="${c.id}" ${c.id === cur.centerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>${K.fields.map(fld).join('')}</div>
    <h3>الفئة المشاركة *</h3><div>${K.groups.map((g) => `<label class="chk"><input type="checkbox" data-sg="${g}" ${(cur.meta.groups || []).includes(g) ? 'checked' : ''}> ${esc(SG[g].name)}</label>`).join(' ')}</div></div>
  <div id="sh-meet">${K.multi ? meetingsCard() : ''}</div>
  <div id="sh-lists">${K.lists.map(listCard).join('')}</div>
  <div class="card" id="sh-check"></div>`;
  refreshCheck();
}

function meetingsCard() {
  const n = Math.max(+cur.meta.meetings || 0, cur.meetings.length);
  return `<div class="card"><h2>اللقاءات الفعلية</h2><p class="small">اكتب تاريخ كل لقاء نُفِّذ فعلاً (اللقاءات بلا تاريخ تُعدّ غير منفَّذة). لا يمكن تسجيل تاريخ مستقبلي أو مكرر أو خارج مدة الدورة.</p>
  <div class="row">${Array.from({ length: n }, (_, i) => `<label>لقاء ${i + 1}<input type="date" data-sv="${i}" value="${esc(cur.meetings[i]?.date || '')}" style="width:150px"></label>`).join('')}</div></div>`;
}

function listCard(L) {
  const K = KINDS[cur.kind], db = ctx.db, ppl = peopleOf(cur, db).filter((x) => x.list === L.key);
  const meets = K.multi ? cur.meetings.map((m, i) => ({ ...m, i })).filter((m) => m.date) : [];
  const head = `<tr><th>#</th><th>الاسم</th><th>الجنس</th>${L.age ? '<th>العمر</th>' : ''}<th>إعاقة</th>${meets.map((m) => `<th title="${esc(m.date)}">${m.i + 1}<br><button class="sec" style="padding:0 5px;font-size:13px" data-shact="col" data-i="${m.i}">كل</button></th>`).join('')}${meets.length ? '<th>%</th>' : ''}<th></th></tr>`;
  const comp = K.multi ? new Map(completion(cur, db).map((c) => [c.id, c])) : null;
  const rows = ppl.map((x, i) => { const age = x.guest ? x.age : x.bnf ? ageAt(x.bnf, cur.meta.date || cur.meta.start || new Date().toISOString().slice(0, 10)) : '';
    return `<tr><td>${i + 1}</td><td>${esc(x.missing ? '(محذوف)' : x.name)}</td><td>${x.sex === 'M' ? 'ذكر' : x.sex === 'F' ? 'أنثى' : '؟'}</td>${L.age ? `<td>${age ?? '؟'}</td>` : ''}<td>${x.disability ? esc(x.dtype ? x.dtype + (x.dtypeOther ? ': ' + x.dtypeOther : '') : 'نعم — النوع؟') : ''}</td>${meets.map((m) => `<td><input type="checkbox" data-sp="${m.i}|${x.id}" ${cur.meetings[m.i].present.includes(x.id) ? 'checked' : ''}></td>`).join('')}${meets.length ? `<td>${comp?.get(x.id) ? `<span class="badge b-${comp.get(x.id).ok === false ? 'warn' : 'ok'}">${comp.get(x.id).pct}%</span>` : ''}</td>` : ''}<td><button class="x" data-shact="rm" data-l="${L.key}" data-id="${x.guest ? x.id.slice(1) : x.id}">إزالة</button></td></tr>`; }).join('');
  const qa = quick[L.key];
  return `<div class="card"><h2>${esc(L.label)} (${ppl.length})</h2>
    ${L.inline ? '' : `<div class="row"><label>بحث في سجل المستفيدين<input data-sq="${L.key}" value="${esc(q[L.key] || '')}" placeholder="اكتب جزءاً من الاسم" style="width:260px"></label>
      <label class="chk"><input type="checkbox" data-shall="${L.key}" ${showAll[L.key] ? 'checked' : ''}> إظهار غير المطابقين للفئة</label></div>
      ${filterBar(L)}<div id="res-${L.key}" style="margin:8px 0">${results(L)}</div>`}
    <div class="row" style="margin:6px 0"><button class="sec" data-shact="quick" data-l="${L.key}">${qa ? 'إغلاق النموذج' : L.inline ? '+ إضافة زائر' : '+ مستفيد جديد (غير موجود في السجل)'}</button></div>${qa ? quickForm(L) : ''}
    ${ppl.length ? `<div class="tw"><table>${head}${rows}</table></div>` : '<p class="small">لا مشاركين بعد.</p>'}</div>`;
}
const F0 = () => ({ sex: '', amin: '', amax: '', dis: '', ctr: '', act: '', sort: 'name' });
const fl = (k) => (flt[k] ||= F0());
function filterBar(L) {
  const f = fl(L.key), p = ctx.project(), K = (n, v, o) => `<label>${n}<select data-sf="${L.key}|${v}">${o.map(([a, b]) => `<option value="${a}" ${f[v] === a ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
  return `<div class="row fbar">${K('الجنس', 'sex', [['', 'الكل'], ['M', 'ذكر'], ['F', 'أنثى']])}
    <label>العمر من<input type="number" min="0" max="99" data-sf="${L.key}|amin" value="${esc(f.amin)}" style="width:70px"></label><label>إلى<input type="number" min="0" max="99" data-sf="${L.key}|amax" value="${esc(f.amax)}" style="width:70px"></label>
    ${K('الإعاقة', 'dis', [['', 'الكل'], ['1', 'ذوو إعاقة'], ['0', 'بلا إعاقة']])}
    ${K('المركز', 'ctr', [['', 'الكل'], ...ctx.myCenters().map((c) => [c.id, c.name])])}
    ${K('سبق حضوره نشاط', 'act', [['', 'أي نشاط'], ...p.activities.filter((a) => !a.ops).map((a) => [a.id, a.name])])}
    ${K('الترتيب', 'sort', [['name', 'الاسم'], ['age', 'العمر'], ['new', 'الأحدث إضافة']])}
    <button class="sec" data-shact="fclear" data-l="${L.key}">مسح الفلاتر</button></div>`;
}
function pool(L) {
  const db = ctx.db, inList = new Set(cur[L.key] || []), term = (q[L.key] || '').trim(), f = fl(L.key), on = cur.meta.date || cur.meta.start || iso();
  const att = f.act ? new Set(db.sessions.filter((x) => x.activityId === f.act).flatMap((x) => x.attendance || [])) : null;
  const amin = f.amin === '' ? null : +f.amin, amax = f.amax === '' ? null : +f.amax;
  const out = db.beneficiaries.filter((b) => {
    if (inList.has(b.id) || (term && !b.name.includes(term)) || (!showAll[L.key] && !eligible(L, b))) return false;
    if (f.sex && b.sex !== f.sex) return false; if (f.dis === '1' && !b.disability) return false; if (f.dis === '0' && b.disability) return false;
    if (f.ctr && b.center !== f.ctr) return false; if (att && !att.has(b.id)) return false;
    if (amin != null || amax != null) { const a = ageAt(b, on); if (a == null || (amin != null && a < amin) || (amax != null && a > amax)) return false; }
    return true;
  });
  if (f.sort === 'age') out.sort((a, b) => (ageAt(a, on) ?? 999) - (ageAt(b, on) ?? 999)); else if (f.sort === 'new') out.reverse(); else out.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return out;
}
function results(L) {
  if (!(cur.meta.groups || []).filter((k) => L.allowed.includes(k)).length) return '<span class="small">اختر الفئة المشاركة أعلاه أولاً.</span>';
  const all = pool(L), PS = 50, pages = Math.max(1, Math.ceil(all.length / PS)), pg = Math.min(lim[L.key] || 0, pages - 1), res = all.slice(pg * PS, pg * PS + PS), sel = (pick[L.key] ||= new Set()); for (const id of [...sel]) if (!all.some((b) => b.id === id)) sel.delete(id);
  const on = cur.meta.date || cur.meta.start || iso(), cn = (id) => ctx.db.centers.find((c) => c.id === id)?.name || '', cnt = {}; for (const x of ctx.db.sessions) for (const id of x.attendance || []) cnt[id] = (cnt[id] || 0) + 1;
  const bar = `<div class="row" style="align-items:center;margin-bottom:6px"><span class="small">النتيجة: <b>${all.length}</b> مستفيد — محدد: <b>${sel.size}</b></span>
    <button class="sec" data-shact="pickAdd" data-l="${L.key}" ${sel.size ? '' : 'disabled'}>إضافة المحدد (${sel.size})</button>
    <button class="sec" data-shact="pickAll" data-l="${L.key}" ${all.length ? '' : 'disabled'}>تحديد كل النتائج (${all.length})</button>
    <button class="gold" data-shact="addAllRes" data-l="${L.key}" ${all.length ? '' : 'disabled'}>إضافة كل النتائج (${all.length})</button>${sel.size ? `<button class="sec" data-shact="pickNone" data-l="${L.key}">إلغاء التحديد</button>` : ''}</div>`;
  const allOn = res.length && res.every((b) => sel.has(b.id));
  const rows = res.map((b) => `<tr class="${sel.has(b.id) ? 'ptr-on' : ''}"><td><input type="checkbox" data-pk="${L.key}|${b.id}" ${sel.has(b.id) ? 'checked' : ''}></td><td>${esc(b.name)}</td><td>${b.sex === 'M' ? '<span class="gc gm"><b>ذكر</b></span>' : '<span class="gc gf"><b>أنثى</b></span>'}</td><td>${ageAt(b, on) ?? ''}</td><td>${b.disability ? '<span class="gc gd"><span>إعاقة</span></span>' : ''}</td><td>${esc(cn(b.center))}</td><td>${cnt[b.id] ? cnt[b.id] + ' جلسات' : '—'}</td><td><button class="sec" data-shact="add" data-l="${L.key}" data-id="${b.id}">+</button></td></tr>`).join('');
  const table = res.length ? `<div class="tw ptab"><table><tr><th><input type="checkbox" data-pkpage="${L.key}" ${allOn ? 'checked' : ''} title="تحديد الصفحة"></th><th>الاسم</th><th>الجنس</th><th>العمر</th><th>إعاقة</th><th>المركز</th><th>حضر سابقًا</th><th></th></tr>${rows}</table></div>` : '<span class="small">لا نتائج — غيّر الفلاتر أو أضف مستفيداً جديداً بالزر أدناه.</span>';
  const nav = all.length > PS ? `<div class="row" style="align-items:center;margin-top:8px"><span class="small">صفحة ${pg + 1} من ${pages}</span><button class="sec" data-shact="pgPrev" data-l="${L.key}" ${pg ? '' : 'disabled'}>السابق</button><button class="sec" data-shact="pgNext" data-l="${L.key}" ${pg < pages - 1 ? '' : 'disabled'}>التالي</button></div>` : '';
  return bar + table + nav;
}
const iso = () => new Date().toISOString().slice(0, 10);
function quickForm(L) {
  return `<div class="card" style="background:var(--warnbg)"><div class="row"><label>الاسم (3 مقاطع على الأقل) *<input id="qa-name" style="width:260px"></label><label>الجنس *<select id="qa-sex"><option value=""></option><option value="M">ذكر</option><option value="F">أنثى</option></select></label>
    <label>العمر *<input id="qa-age" type="number" min="3" max="90" style="width:80px"></label><label>إعاقة<select id="qa-dis"><option value="0">لا</option><option value="1">نعم</option></select></label>
    <label>نوع الإعاقة<select id="qa-dt"><option value=""></option>${DTYPES.map((d) => `<option>${d}</option>`).join('')}</select></label><label id="qa-dow" hidden>حدّد النوع (أخرى) *<input id="qa-do" style="width:160px" placeholder="اكتب نوع الإعاقة"></label>${L.inline ? '' : '<label>الهاتف (اختياري)<input id="qa-ph" style="width:130px" placeholder="059xxxxxxx"></label>'}
    <button data-shact="quickSave" data-l="${L.key}">إضافة</button></div><div id="qa-err" class="small" style="color:var(--err)"></div></div>`;
}

function checkHTML() {
  const db = ctx.db, K = KINDS[cur.kind], r = validateSheet(cur, db), d = derivedCounts(cur, db), comp = K.multi ? completion(cur, db) : null;
  const types = Object.entries(d.types).map(([k, n]) => `${k}: ${n}`).join('، ');
  return `<h2>الأعداد (تُحسب تلقائياً من القائمة)</h2><div class="row"><span class="badge b-info">الإجمالي <b>${d.total}</b></span>${gc('gm', 'ذكور', d.M)}${gc('gf', 'إناث', d.F)}${gc('gd', 'ذكور ذوو إعاقة', d.MWD)}${gc('gd', 'إناث ذوات إعاقة', d.FWD)}${gc('gn', 'بلا إعاقة', d.total - d.MWD - d.FWD)}${types ? `<span class="badge b-info">نوع الإعاقة: ${esc(types)}</span>` : ''}
    ${comp && cur.meta.mandatoryPct != null && cur.meta.mandatoryPct !== '' ? `<span class="badge b-ok">مستوفون لنسبة الحضور (${cur.meta.mandatoryPct}%): <b>${comp.filter((c) => c.ok).length}</b> من ${comp.length}</span>` : ''}</div>
    <h2>الفحص قبل الحفظ</h2>${r.errors.map((e) => `<p style="margin:3px 0"><span class="badge b-error">خطأ</span> ${esc(e)}</p>`).join('')}${r.warnings.map((e) => `<p style="margin:3px 0"><span class="badge b-warn">تنبيه</span> ${esc(e)}</p>`).join('')}${!r.errors.length && !r.warnings.length ? '<span class="badge b-ok">لا ملاحظات ✔</span>' : ''}
    <div class="row" style="margin-top:12px"><button data-shact="save" ${r.errors.length ? 'disabled' : ''}>حفظ الكشف</button>${r.errors.length ? `<span class="small">لا يمكن الحفظ قبل معالجة ${r.errors.length} خطأ</span>` : ''}</div>`;
}
const relist = () => { const e = $('#sh-lists'); if (e) e.innerHTML = KINDS[cur.kind].lists.map(listCard).join(''); refreshCheck(); };
const remeet = () => { const e = $('#sh-meet'); if (e) e.innerHTML = KINDS[cur.kind].multi ? meetingsCard() : ''; };
// لا نستبدل العقدة إن لم يتغير المحتوى: وإلا ضاعت نقرة الزر حين يُطلق «change» عند فقدان التركيز قبل رفع الفأرة
const refreshCheck = () => { const e = $('#sh-check'); if (!e) return; const h = checkHTML(); if (e.dataset.h !== h) { e.innerHTML = h; e.dataset.h = h; } };
const syncMeetings = () => { const n = +cur.meta.meetings || 0; while (cur.meetings.length < n) cur.meetings.push({ n: cur.meetings.length + 1, date: '', present: [] }); while (cur.meetings.length > Math.max(n, 1)) { const l = cur.meetings[cur.meetings.length - 1]; if (l.date || l.present.length) break; cur.meetings.pop(); } };

// ---------- الأحداث ----------
function onInput(e) {
  if (!live()) return; const t = e.target, d = t.dataset || {}, isChange = e.type === 'change';
  if (d.sm) { const f = KINDS[cur.kind].fields.find((x) => x.key === d.sm); const raw = t.value; cur.meta[d.sm] = f && (f.type === 'number' || f.type === 'int') ? (raw === '' ? '' : +raw) : raw; if (isChange && d.sm === 'meetings') { syncMeetings(); remeet(); relist(); } else if (d.sm === 'mode') { const e = $('#sh-vl'); if (e) e.textContent = raw === 'online' ? 'المنصة (زوم/تيمز…) *' : 'مكان التنفيذ (القاعة) *'; refreshCheck(); } else refreshCheck(); }
  else if (d.sl) { cur.meta[d.sl] = t.value.split('\n').map((x) => x.trim()).filter(Boolean); refreshCheck(); }
  else if (d.sg) { if (!isChange) return; const s = new Set(cur.meta.groups || []); t.checked ? s.add(d.sg) : s.delete(d.sg); cur.meta.groups = [...s]; relist(); }
  else if (d.sv !== undefined) { if (!isChange) return; const i = +d.sv; while (cur.meetings.length <= i) cur.meetings.push({ n: cur.meetings.length + 1, date: '', present: [] }); cur.meetings[i].date = t.value; if (!t.value) cur.meetings[i].present = []; relist(); }
  else if (d.sp) { const [i, id] = d.sp.split('|'); const a = cur.meetings[+i].present; if (t.checked) { if (!a.includes(id)) a.push(id); } else cur.meetings[+i].present = a.filter((x) => x !== id); refreshCheck(); }
  else if (d.sf) { const [k, fld] = d.sf.split('|'); if (fl(k)[fld] === t.value) return; fl(k)[fld] = t.value; lim[k] = 0; const L = KINDS[cur.kind].lists.find((x) => x.key === k), r = $('#res-' + k); if (r) r.innerHTML = results(L); }
  else if (d.pkpage) { if (!isChange) return; const k = d.pkpage, st = (pick[k] ||= new Set()), L = KINDS[cur.kind].lists.find((x) => x.key === k); const pgn = Math.min(lim[k] || 0, Math.max(0, Math.ceil(pool(L).length / 50) - 1)); for (const b of pool(L).slice(pgn * 50, pgn * 50 + 50)) t.checked ? st.add(b.id) : st.delete(b.id); const r = $('#res-' + k); if (r) r.innerHTML = results(L); }
  else if (d.pk) { if (!isChange) return; const [k, id] = d.pk.split('|'), st = (pick[k] ||= new Set()); t.checked ? st.add(id) : st.delete(id); const L = KINDS[cur.kind].lists.find((x) => x.key === k), r = $('#res-' + k); if (r) r.innerHTML = results(L); }
  else if (d.sq) { if ((q[d.sq] || '') === t.value) return; q[d.sq] = t.value; const L = KINDS[cur.kind].lists.find((x) => x.key === d.sq), r = $('#res-' + d.sq); if (r) r.innerHTML = results(L); }
  else if (d.shall) { if (!isChange) return; showAll[d.shall] = t.checked; const L = KINDS[cur.kind].lists.find((x) => x.key === d.shall), r = $('#res-' + d.shall); if (r) r.innerHTML = results(L); }
  else if (t.id === 'qa-dt' || t.id === 'qa-dis') { const w = $('#qa-dow'); if (w) w.hidden = !($('#qa-dis').value === '1' && $('#qa-dt').value === 'أخرى'); }
  else if (t.id === 'sh-act') { cur.activityId = t.value || null; refreshCheck(); }
  else if (t.id === 'sh-ctr') { cur.centerId = t.value || null; refreshCheck(); }
}

async function onClick(e) {
  const t = e.target.closest('[data-shact]'); if (!t) return; const a = t.dataset.shact, db = ctx.db, p = ctx.project();
  if (a === 'new') { setCur(newSheet(t.dataset.k, p.id, ctx.myCenters()[0]?.id)); return editor(); }
  if (a === 'edit') { setCur(JSON.parse(JSON.stringify(db.sheets.find((s) => s.id === t.dataset.id)))); return editor(); }
  if (a === 'del') { if (!(await ctx.ask('حذف هذا الكشف وكل جلساته؟'))) return; removeSheet(db, t.dataset.id); ctx.save(); return vSheets(); }
  if (!live()) return;
  const L = t.dataset.l && KINDS[cur.kind].lists.find((x) => x.key === t.dataset.l);
  if (a === 'draft') { putDraft({ id: dId(), type: 'sheet', projectId: cur.projectId, title: sheetTitle(cur), data: cur }); cur = null; base = ''; ctx.toast('حُفظ كمسودة — تجدها في أعلى هذه الشاشة وفي زر المسودات'); return vSheets(); }
  if (a === 'cancel') { const has = !!getDraft(dId()); if (!(await ctx.ask(has ? 'إغلاق الكشف دون حفظ؟ سيبقى آخر ما حُفظ في المسودة. (لحذف المسودة نفسها استخدم «حذف» من قائمة المسودات)' : 'إغلاق الكشف دون حفظ التعديلات؟'))) return; cur = null; base = ''; return vSheets(); }
  if (a === 'fclear') { flt[L.key] = F0(); q[L.key] = ''; return relist(); }
  if (a === 'pgNext' || a === 'pgPrev') { lim[L.key] = Math.max(0, (lim[L.key] || 0) + (a === 'pgNext' ? 1 : -1)); return ($('#res-' + L.key).innerHTML = results(L)); }
  if (a === 'pickNone') { pick[L.key] = new Set(); return ($('#res-' + L.key).innerHTML = results(L)); }
  if (a === 'pickAll') { pick[L.key] = new Set(pool(L).map((b) => b.id)); return ($('#res-' + L.key).innerHTML = results(L)); }
  if (a === 'pickAdd') { const ids = [...(pick[L.key] || [])]; (cur[L.key] ||= []).push(...ids.filter((id) => !cur[L.key].includes(id))); pick[L.key] = new Set(); ctx.toast(`أُضيف ${ids.length} مشاركًا`); return relist(); }
  if (a === 'addAllRes') { const ids = pool(L).map((b) => b.id); if (ids.length > 30 && !(await ctx.ask(`إضافة ${ids.length} مستفيدًا دفعة واحدة إلى الكشف؟`))) return; (cur[L.key] ||= []).push(...ids.filter((id) => !cur[L.key].includes(id))); pick[L.key] = new Set(); ctx.toast(`أُضيف ${ids.length} مشاركًا`); return relist(); }
  if (a === 'add') { (cur[L.key] ||= []).push(t.dataset.id); return relist(); }
  if (a === 'rm') { if (L.inline) cur.guests.splice(+t.dataset.id, 1); else { cur[L.key] = cur[L.key].filter((x) => x !== t.dataset.id); cur.meetings.forEach((m) => (m.present = m.present.filter((x) => x !== t.dataset.id))); } return relist(); }
  if (a === 'col') { const m = cur.meetings[+t.dataset.i], ids = [...new Set(cur.roster || [])], all = ids.every((id) => m.present.includes(id)); m.present = all ? [] : [...ids]; return relist(); }
  if (a === 'quick') { quick[t.dataset.l] = !quick[t.dataset.l]; return relist(); }
  if (a === 'quickSave') return quickSave(L);
  if (a === 'save') return save();
}

async function quickSave(L) {
  const db = ctx.db, g = (id) => $('#' + id)?.value ?? '', name = g('qa-name').trim().replace(/\s+/g, ' '), sex = g('qa-sex'), age = g('qa-age') === '' ? null : +g('qa-age'), dis = g('qa-dis') === '1', dt = g('qa-dt'), dto = g('qa-do').trim(), ph = g('qa-ph').replace(/[\s-]/g, ''), er = [];
  if (!nameOk(name)) er.push('الاسم يجب أن يكون ثلاثة مقاطع على الأقل'); if (!sex) er.push('اختر الجنس'); if (age == null || !Number.isInteger(age) || age < 3 || age > 90) er.push('العمر مطلوب (3–90)'); if (dis && !dt) er.push('حدّد نوع الإعاقة'); if (dis && dt === 'أخرى' && !dto) er.push('اكتب نوع الإعاقة (أخرى)'); if (ph && !phoneOk(ph)) er.push('الهاتف يبدأ بـ 059 أو 056 ويتكون من 10 أرقام');
  const rg = L && (cur.meta.groups || []).filter((k) => L.allowed.includes(k)).map((k) => SG[k]); if (L?.age && age != null && rg.length && !rg.some((x) => age >= x.min && age <= x.max)) er.push(`العمر ${age} خارج الفئات المختارة`);
  if (er.length) { $('#qa-err').textContent = er.join(' — '); return; }
  if (L.inline) { cur.guests.push({ name, sex, age, disability: dis, dtype: dis ? dt : '', ...(dis && dt === 'أخرى' ? { dtypeOther: dto } : {}) }); quick[L.key] = true; return relist(); }
  const dup = db.beneficiaries.find((x) => x.name.trim() === name && x.sex === sex); if (dup && !(await ctx.ask('يوجد مستفيد بنفس الاسم والجنس في السجل. هل هو شخص آخر؟ (تأكيد = إضافة كشخص جديد، إلغاء = استخدم الموجود)'))) { (cur[L.key] ||= []).includes(dup.id) || cur[L.key].push(dup.id); return relist(); }
  const b = { id: uid('b'), name, sex, age, disability: dis, disabilityType: dis ? dt : '', ...(dis && dt === 'أخرى' ? { disabilityOther: dto } : {}), phone: ph, center: cur.centerId }; db.beneficiaries.push(b); (cur[L.key] ||= []).push(b.id); ctx.save(); return relist();
}

async function save() {
  const db = ctx.db, r = validateSheet(cur, db); if (r.errors.length) return ctx.toast('عالج الأخطاء أولاً');
  if (r.warnings.length && !(await ctx.ask('تنبيهات:\n' + r.warnings.map((w) => '• ' + w).join('\n') + '\n\nحفظ رغم ذلك؟'))) return;
  commitSheet(db, cur); delDraft(dId()); ctx.save(); ctx.toast('تم حفظ الكشف وتوليد جلساته'); cur = null; base = ''; vSheets();
}
