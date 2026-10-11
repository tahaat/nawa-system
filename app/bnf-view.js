// شاشة «المستفيدون (BTT)»: إضافة/تعديل بتحقق لحظي (توهج)، نوع إعاقة مشروط، معلومات إضافية، مرفقات (ملف/رابط)، استيراد Excel بقالب
import ExcelJS from 'exceljs';
import { ageAt, bandOf, iso, uid } from '../core/model.js';
import { DTYPES, commitSheet } from '../core/sheets.js';
import { nameState, phoneState, idState, emailState, normPhone, phoneOkStrict, digits, emailOk, ATT_TYPES, ATT_MAX, urlOk, nameNeed, words, toLatin } from '../core/bnf.js';
import { putFile, getFile, delFile, fileIds } from './store.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx; const st = { q: '', edit: null, keep: [], pend: [], gone: [], have: new Set() };
export const initBnf = (c) => { ctx = c; };
const TYPE = Object.fromEntries(ATT_TYPES);
const CHK = { name: nameState, phone: phoneState, ephone: phoneState, nid: idState, email: emailState };
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

function paint(t) {
  const f = CHK[t.dataset.chk]; if (!f) return; const r = f(t.value), lab = t.closest('label'), h = lab?.querySelector('.fh');
  t.classList.remove('fld-bad', 'fld-ok', 'fld-warn'); if (r.s !== 'empty') t.classList.add(r.s === 'bad' ? 'fld-bad' : r.s === 'warn' ? 'fld-warn' : 'fld-ok');
  if (h) { h.textContent = r.msg || ''; h.className = 'fh ' + (r.s === 'bad' ? 'bad' : r.s === 'warn' ? 'warn' : 'ok'); }
}
const cur = () => (st.edit ? ctx.db.beneficiaries.find((b) => b.id === st.edit) : null);
const attList = () => [...st.keep, ...st.pend];

function attHtml() {
  const rows = attList().map((a) => { const miss = a.kind === 'file' && !st.pend.includes(a) && !st.have.has(a.id);
    return `<tr><td>${esc(a.title || a.name || a.url)}${miss ? ' <span class="badge b-warn">الملف غير موجود على هذا الجهاز</span>' : ''}</td><td>${esc(TYPE[a.type] || a.type)}</td><td>${a.kind === 'link' ? 'رابط' : 'ملف ' + (a.size ? '· ' + fmtSize(a.size) : '')}</td><td>${miss ? '' : `<button type="button" class="sec" data-act="bAttOpen" data-id="${a.id}">فتح</button>`} <button type="button" class="x" data-act="bAttDel" data-id="${a.id}">حذف</button></td></tr>`; }).join('');
  return `<h3>المرفقات والمستندات الداعمة</h3>${rows ? `<table><tr><th>العنوان</th><th>النوع</th><th>الصيغة</th><th></th></tr>${rows}</table>` : '<p class="small">لا مرفقات بعد.</p>'}
  <div class="row"><label>نوع المرفق<select id="at-type">${ATT_TYPES.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
  <label>الصيغة<select id="at-kind"><option value="file">ملف من الجهاز</option><option value="link">رابط</option></select></label>
  <label>العنوان (اختياري)<input id="at-title" placeholder="مثال: صورة الهوية — الوجه الأمامي"></label>
  <label id="at-fw">الملف<input type="file" id="at-file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label>
  <label id="at-uw" hidden>الرابط<input id="at-url" dir="ltr" placeholder="https://drive.google.com/..."></label><button type="button" class="sec" data-act="bAttAdd">+ إرفاق</button></div>
  <p class="small">الملفات تُحفظ على هذا الجهاز فقط (حتى 5 ميغابايت للملف، والصور تُضغط تلقائيًا) ولا تدخل في النسخة الاحتياطية JSON ولا المزامنة؛ استعمل «رابط» لما يجب أن يصل لباقي الفريق.</p>`;
}
function formHtml(b) {
  const v = b || {}, dis = !!v.disability, nw = nameNeed();
  return `<div class="card" id="bnform"><h2>${b ? 'تعديل مستفيد' : 'إضافة مستفيد'}</h2><div class="row">
    <label>الاسم الرباعي<input id="bn" data-chk="name" autocomplete="off" placeholder="مثال: محمد أحمد علي سالم" value="${esc(v.name)}" style="width:280px"><span class="fh"></span></label>
    <label>الجنس<select id="bs"><option value="M" ${v.sex === 'M' ? 'selected' : ''}>ذكر</option><option value="F" ${v.sex === 'F' ? 'selected' : ''}>أنثى</option></select></label>
    <label>العمر<input id="ba" type="number" min="0" max="120" placeholder="مثال: 12" value="${v.age ?? ''}" style="width:90px"></label>
    <label>أو تاريخ الميلاد<input id="bd" type="date" value="${esc(v.dob || '')}"></label>
    <label>الإعاقة<select id="bdis"><option value="0">لا</option><option value="1" ${dis ? 'selected' : ''}>نعم</option></select></label>
    <label id="bdtw" ${dis ? '' : 'hidden'}>نوع الإعاقة<select id="bdt"><option value="">— اختر النوع —</option>${DTYPES.map((d) => `<option ${v.disabilityType === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}${v.disabilityType && !DTYPES.includes(v.disabilityType) ? `<option selected>${esc(v.disabilityType)}</option>` : ''}</select></label>
    <label>رقم الجوال<input id="bp" data-chk="phone" inputmode="numeric" dir="ltr" placeholder="0591234567" value="${esc(v.phone || '')}" style="width:150px"><span class="fh"></span></label></div>
    <p class="small" id="bhint">الاسم يُعدّ مكتملًا عند ${nw} مقاطع فأكثر (يتوهج الحقل بالأحمر ثم بالأخضر)، والجوال 10 أرقام يبدأ بـ 059 أو 056.</p>
    <details ${b && (v.nationalId || v.email || v.emergencyPhone || (v.attachments || []).length) ? 'open' : ''}><summary>معلومات إضافية ومرفقات (اختيارية)</summary><div class="row">
    <label>رقم الهوية<input id="bnid" data-chk="nid" inputmode="numeric" dir="ltr" placeholder="123456789" value="${esc(v.nationalId || '')}" style="width:150px"><span class="fh"></span></label>
    <label>البريد الإلكتروني<input id="bem" data-chk="email" type="email" dir="ltr" placeholder="example@gmail.com" value="${esc(v.email || '')}" style="width:230px"><span class="fh"></span></label>
    <label>اسم جهة اتصال الطوارئ<input id="ben" placeholder="مثال: والد/ة أو قريب" value="${esc(v.emergencyName || '')}" style="width:200px"></label>
    <label>هاتف الطوارئ<input id="bep" data-chk="ephone" inputmode="numeric" dir="ltr" placeholder="0561234567" value="${esc(v.emergencyPhone || '')}" style="width:150px"><span class="fh"></span></label></div>
    <div id="batt">${attHtml()}</div></details>
    <div class="row" style="margin-top:10px"><button type="button" data-act="bSave">${b ? 'حفظ التعديل' : '+ إضافة'}</button>${b ? '<button type="button" class="sec" data-act="bCancel">إلغاء</button>' : ''}</div></div>`;
}
export function vBnf() {
  const db = ctx.db, q = st.q.trim(), list = db.beneficiaries.filter((b) => !q || b.name.includes(q) || (b.phone || '').includes(q) || (b.nationalId || '').includes(q)).slice(0, 400), need = nameNeed(), today = iso(new Date());
  ctx.view().innerHTML = formHtml(cur()) + `
  <div class="card"><h2>استيراد من Excel</h2><p class="small">الأعمدة المدعومة: الاسم، الجنس، العمر، تاريخ الميلاد، الإعاقة، نوع الإعاقة، الجوال، الهوية، البريد، اسم الطوارئ، هاتف الطوارئ. تُتجاهل القيم غير الصحيحة (جوال/هوية/بريد) وتُعدّ في التقرير.</p>
  <div class="row"><label>الملف<input type="file" id="bimp" accept=".xlsx"></label><button class="sec" data-act="bImp">استيراد</button><button class="sec" data-act="bTpl">تنزيل قالب الاستيراد</button></div><p id="bimsg" class="small"></p></div>
  <div class="card"><div class="row"><label>بحث<input id="bq" placeholder="اسم أو جوال أو هوية" value="${esc(q)}"></label><span class="small">${db.beneficiaries.length} مستفيد</span></div>
  <div class="tw"><table><tr><th>الاسم</th><th>الجنس</th><th>العمر</th><th>الفئة</th><th>إعاقة</th><th>الجوال</th><th>مرفقات</th><th>جلسات حضور</th><th></th></tr>${list.map((b) => { const age = ageAt(b, today), n = db.sessions.filter((s) => s.mode === 'roll' && s.attendance.includes(b.id)).length, short = words(b.name) < need;
    return `<tr><td>${esc(b.name)}${short ? ' <span class="badge b-warn">منقوص</span>' : ''}</td><td>${b.sex === 'M' ? 'ذكر' : 'أنثى'}</td><td>${age ?? '؟'}</td><td>${bandOf(age)?.key || '—'}</td><td>${b.disability ? esc(b.disabilityType || 'نعم') : ''}</td><td dir="ltr">${esc(b.phone || '')}</td><td>${(b.attachments || []).length || ''}</td><td>${n}</td><td><button class="sec" data-act="bEdit" data-id="${b.id}">تعديل</button> <button class="x" data-act="bDel" data-id="${b.id}">حذف</button></td></tr>`; }).join('')}</table></div></div>`;
  $('#bq').addEventListener('input', (e) => { st.q = e.target.value; clearTimeout(vBnf.t); vBnf.t = setTimeout(() => { vBnf(); const x = $('#bq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 300); });
  document.querySelectorAll('#bnform [data-chk]').forEach((t) => t.value && paint(t));
}
async function loadAtt(b) { st.keep = (b?.attachments || []).map((a) => ({ ...a })); st.pend = []; st.gone = []; st.have = await fileIds(); }
async function shrink(file) {
  if (!/^image\/(jpe?g|png|webp|bmp)$/i.test(file.type)) return file;
  try { const bm = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bm.width, bm.height)), c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const bl = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8)); return bl && bl.size < file.size ? new File([bl], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file; } catch { return file; }
}
const read = () => {
  const g = (i) => ($(i)?.value ?? '').trim(), dis = g('#bdis') === '1';
  return { name: g('#bn').replace(/\s+/g, ' '), sex: g('#bs'), age: g('#ba') === '' ? null : +g('#ba'), dob: g('#bd') || null, disability: dis, disabilityType: dis ? g('#bdt') : '', phone: normPhone(g('#bp')), nationalId: digits(g('#bnid')), email: g('#bem').toLowerCase(), emergencyName: g('#ben'), emergencyPhone: normPhone(g('#bep')) };
};
async function delBnfFull(id) {
  const db = ctx.db; db.sessions.forEach((s) => s.attendance && (s.attendance = s.attendance.filter((x) => x !== id)));
  db.sheets.forEach((sh) => { const had = [sh.roster, sh.rosterP].some((a) => a?.includes(id)); if (!had) return; sh.roster = (sh.roster || []).filter((x) => x !== id); sh.rosterP = (sh.rosterP || []).filter((x) => x !== id); sh.meetings.forEach((m) => (m.present = m.present.filter((x) => x !== id))); commitSheet(db, sh); });
  const b = db.beneficiaries.find((x) => x.id === id); for (const a of b?.attachments || []) if (a.kind === 'file') await delFile(a.id);
  db.beneficiaries = db.beneficiaries.filter((x) => x.id !== id);
}
export function bnfActions({ toast, ask, save, rerender, dl }) {
  document.addEventListener('input', (e) => { if (e.target.dataset?.chk && $('#bnform')?.contains(e.target)) paint(e.target); });
  document.addEventListener('change', (e) => {
    const t = e.target; if (!$('#bnform')?.contains(t)) return;
    if (t.id === 'bdis') { $('#bdtw').hidden = t.value !== '1'; if (t.value !== '1') $('#bdt').value = ''; }
    else if (t.id === 'at-kind') { $('#at-fw').hidden = t.value !== 'file'; $('#at-uw').hidden = t.value !== 'link'; }
  });
  const X = {
    async bEdit(t) { st.edit = t.dataset.id; await loadAtt(cur()); vBnf(); scrollTo({ top: 0, behavior: 'smooth' }); },
    bCancel() { st.edit = null; st.keep = []; st.pend = []; vBnf(); },
    async bSave() {
      const b0 = cur(), r = read(); if (!r.name) { $('#bn').focus(); return toast('الاسم مطلوب'); }
      if (r.phone && !phoneOkStrict(r.phone)) { $('#bp').focus(); return toast('رقم الجوال غير صحيح: 10 أرقام تبدأ بـ 059 أو 056'); }
      if (r.emergencyPhone && !phoneOkStrict(r.emergencyPhone)) { $('#bep').focus(); return toast('هاتف الطوارئ غير صحيح'); }
      if (r.email && !emailOk(r.email)) { $('#bem').focus(); return toast('البريد الإلكتروني غير صحيح'); }
      if (r.nationalId && idState(r.nationalId).s === 'bad') { $('#bnid').focus(); return toast('رقم الهوية 9 أرقام'); }
      if (r.disability && !r.disabilityType) { $('#bdt').focus(); return toast('اختر نوع الإعاقة'); }
      if (r.age != null && (!Number.isInteger(r.age) || r.age < 0 || r.age > 120)) return toast('العمر غير صحيح');
      if (nameState(r.name).s === 'bad' && !(await ctx.ask(`الاسم أقل من ${nameNeed()} مقاطع. حفظ رغم ذلك؟`))) return;
      const dup = ctx.db.beneficiaries.find((x) => x.id !== b0?.id && x.name.trim() === r.name && x.sex === r.sex); if (dup && !(await ctx.ask('يوجد مستفيد بنفس الاسم والجنس. حفظ رغم ذلك؟'))) return;
      if (r.dob) r.age = null;
      // المرفقات: نكتب الملفات الجديدة ونحذف المحذوفة
      for (const a of st.pend) if (a.kind === 'file') await putFile(a.id, a.blob);
      for (const id of st.gone) await delFile(id);
      const att = [...st.keep, ...st.pend].map(({ blob, ...m }) => m), now = new Date().toISOString();
      if (b0) Object.assign(b0, r, { attachments: att, updatedAt: now }); else ctx.db.beneficiaries.push({ id: uid('b'), ...r, attachments: att, createdAt: now });
      if (!att.length) { const x = b0 || ctx.db.beneficiaries.at(-1); delete x.attachments; }
      st.edit = null; st.keep = []; st.pend = []; st.gone = []; save(); toast(b0 ? 'حُفظ التعديل' : 'أُضيف المستفيد'); vBnf();
    },
    async bDel(t) { const b = ctx.db.beneficiaries.find((x) => x.id === t.dataset.id); if (ctx.db.sessions.some((s) => s.attendance?.includes(b.id)) && !(await ask('للمستفيد حضور مسجّل؛ سيُحذف من الجلسات أيضًا. متابعة؟'))) return; if ((b.attachments || []).length && !(await ask('ستُحذف مرفقاته أيضًا. متابعة؟'))) return; await delBnfFull(b.id); if (st.edit === b.id) st.edit = null; save(); vBnf(); },
    async bAttAdd() {
      const type = $('#at-type').value, kind = $('#at-kind').value, title = $('#at-title').value.trim();
      if (kind === 'link') { const u = $('#at-url').value.trim(); if (!urlOk(u)) return toast('أدخل رابطًا صحيحًا يبدأ بـ https://'); st.pend.push({ id: uid('a'), kind, type, title, url: u }); }
      else { let f = $('#at-file').files[0]; if (!f) return toast('اختر ملفًا'); f = await shrink(f); if (f.size > ATT_MAX) return toast(`الملف أكبر من ${fmtSize(ATT_MAX)}`); st.pend.push({ id: uid('a'), kind, type, title, name: f.name, mime: f.type, size: f.size, blob: f }); }
      $('#batt').innerHTML = attHtml();
    },
    bAttDel(t) { const id = t.dataset.id, k = st.keep.findIndex((a) => a.id === id); if (k >= 0) { const [a] = st.keep.splice(k, 1); if (a.kind === 'file') st.gone.push(a.id); } else st.pend = st.pend.filter((a) => a.id !== id); $('#batt').innerHTML = attHtml(); },
    async bAttOpen(t) {
      const a = attList().find((x) => x.id === t.dataset.id); if (!a) return; if (a.kind === 'link') return window.open(a.url, '_blank', 'noopener');
      const bl = a.blob || (await getFile(a.id)); if (!bl) return toast('الملف غير موجود على هذا الجهاز'); const u = URL.createObjectURL(bl);
      if (/^image\/|pdf$/.test(bl.type)) window.open(u, '_blank'); else Object.assign(document.createElement('a'), { href: u, download: a.name || 'file' }).click(); setTimeout(() => URL.revokeObjectURL(u), 60000);
    },
    async bTpl() {
      const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('المستفيدون', { views: [{ rightToLeft: true }] }), H = ['الاسم', 'الجنس', 'العمر', 'تاريخ الميلاد', 'الإعاقة', 'نوع الإعاقة', 'الجوال', 'الهوية', 'البريد', 'اسم الطوارئ', 'هاتف الطوارئ'];
      ws.addRow(H); ws.addRow(['محمد أحمد علي سالم', 'ذكر', 12, '', 'لا', '', '0591234567', '123456789', 'example@gmail.com', 'أحمد سالم (الأب)', '0561234567']); ws.addRow(['سلمى خالد محمود عطية', 'أنثى', '', '2014-05-20', 'نعم', 'حركية', '0561112233', '', '', '', '']);
      ws.columns.forEach((c) => (c.width = 22)); ws.eachRow((r, i) => r.eachCell((c) => { c.font = { name: 'Sakkal Majalla', size: 13, bold: i === 1, color: i === 1 ? { argb: 'FFFFFFFF' } : undefined }; if (i === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA21008' } }; }));
      const n = wb.addWorksheet('تعليمات'); n.addRows([['الاسم والجنس مطلوبان؛ الجنس: ذكر/أنثى.'], ['الجوال: 10 أرقام تبدأ بـ 059 أو 056. الهوية: 9 أرقام.'], ['الإعاقة: نعم/لا، ونوعها من القائمة المعرّفة في البرنامج.'], ['احذف صفّي المثال قبل الاستيراد.']]); n.getColumn(1).width = 70; n.eachRow((r) => (r.getCell(1).font = { name: 'Sakkal Majalla', size: 13 }));
      dl(await wb.xlsx.writeBuffer(), 'nawa-beneficiaries-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    },
    async bImp() {
      const f = $('#bimp').files[0]; if (!f) return toast('اختر ملفًا'); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.worksheets[0];
      const head = ws.getRow(1).values.map((v) => String(v?.result ?? v ?? '').trim()), col = (re, not) => head.findIndex((h) => h && re.test(h) && !(not && not.test(h)));
      const C = { n: col(/اسم|name/i, /طوارئ|emergency/i), a: col(/عمر|age/i), s: col(/جنس|sex|gender/i), dob: col(/ميلاد|dob|birth/i), dt: col(/نوع.*[إا]عاقة|disab.*type|type.*disab/i), d: col(/[إا]عاقة|disab/i, /نوع|type/i), p: col(/هاتف|جوال|phone|mobile/i, /طوارئ|emergency/i), id: col(/هوية|national|\bid\b/i), em: col(/بريد|e-?mail/i), en: col(/(طوارئ.*اسم|اسم.*طوارئ)|emergency.*name/i), ep: col(/(طوارئ.*(هاتف|جوال))|((هاتف|جوال).*طوارئ)|emergency.*(phone|mobile)/i) };
      if (C.n < 1) return toast('لم أجد عمود الاسم'); const db = ctx.db, seen = new Set(db.beneficiaries.map((b) => b.name.trim() + '|' + b.sex));
      const R = { n: 0, noSex: 0, dup: 0, bp: 0, bi: 0, be: 0, short: 0, bt: 0 }, cell = (r, c) => { if (c < 1) return ''; const v = r.getCell(c).value; return v instanceof Date ? iso(v) : String(v?.result ?? v?.text ?? v ?? '').trim(); };
      ws.eachRow((r, i) => {
        if (i === 1) return; const name = cell(r, C.n).replace(/\s+/g, ' '); if (!name) return; const sx = cell(r, C.s);
        const sex = /^(ذكر|m|male)$/i.test(sx) ? 'M' : /^(أنثى|انثى|f|female)$/i.test(sx) ? 'F' : null; if (!sex) { R.noSex++; return; } if (seen.has(name + '|' + sex)) { R.dup++; return; }
        const b = { id: uid('b'), name, sex, age: null, dob: null, disability: /^(نعم|yes|1|true)$/i.test(cell(r, C.d)) || !!cell(r, C.dt), disabilityType: '' };
        const dob = cell(r, C.dob); if (/^\d{4}-\d{2}-\d{2}$/.test(toLatin(dob))) b.dob = toLatin(dob); else { const a = parseInt(toLatin(cell(r, C.a)), 10); b.age = Number.isFinite(a) ? a : null; }
        const dt = cell(r, C.dt); if (b.disability) b.disabilityType = DTYPES.includes(dt) ? dt : dt || ''; if (dt && !DTYPES.includes(dt) && b.disability) R.bt++;
        const ph = normPhone(cell(r, C.p)); if (ph) { if (phoneOkStrict(ph)) b.phone = ph; else R.bp++; } const ep = normPhone(cell(r, C.ep)); if (ep) { if (phoneOkStrict(ep)) b.emergencyPhone = ep; else R.bp++; }
        const id = digits(cell(r, C.id)); if (id) { if (/^\d{9}$/.test(id)) b.nationalId = id; else R.bi++; } const em = cell(r, C.em).toLowerCase(); if (em) { if (emailOk(em)) b.email = em; else R.be++; } const en = cell(r, C.en); if (en) b.emergencyName = en;
        if (words(name) < nameNeed()) R.short++; db.beneficiaries.push(b); seen.add(name + '|' + sex); R.n++;
      });
      save(); vBnf(); const m = `استُورد ${R.n}` + [R.noSex && `تخطّي ${R.noSex} بلا جنس واضح`, R.dup && `تخطّي ${R.dup} مكررًا`, R.bp && `${R.bp} هاتفًا غير صالح أُهمل`, R.bi && `${R.bi} هوية غير صالحة أُهملت`, R.be && `${R.be} بريدًا غير صالح أُهمل`, R.short && `${R.short} اسمًا منقوصًا (مستورد)`, R.bt && `${R.bt} نوع إعاقة خارج القائمة`].filter(Boolean).map((x) => ' — ' + x).join('');
      const e = $('#bimsg'); if (e) e.textContent = m; toast(m);
    },
  };
  return X;
}
