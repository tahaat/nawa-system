// شاشة «القوائم والإعدادات»: قوائم مدمجة ومخصصة، متغيرات، ثوابت، إدارة المشاريع، وحزمة تصدير/استيراد
import ExcelJS from 'exceljs';
import { cfg, VARS, V, hasVar, DEF_DTYPES, GROUP_KEYS, GROUP_EN_DEF, origLabels, applyConfig, loadConfig, configJSON, listById, listsToRows, rowsToLists, slug } from '../core/settings.js';
import { GROUPS, SEX, SESSION_MODES, AGE_BANDS, CATS, uid } from '../core/model.js';
import { DTYPES } from '../core/sheets.js';
import { ROUNDS, SCALES, SCALE_NAMES } from '../core/forms.js';
import { kvSet } from './store.js';
import { gl, mergePairs } from './glossary.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
let ctx; const st = { tab: 'lists', list: null };
export const initSettings = (c) => { ctx = c; };
export const saveConfig = () => { applyConfig(DTYPES); return kvSet('config', configJSON()); };
const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TABS = [['lists', 'القوائم'], ['vars', 'المتغيرات'], ['consts', 'الثوابت'], ['projects', 'المشاريع'], ['bundle', 'حزمة الإعدادات']];

export function vSettings() {
  const body = { lists: tLists, vars: tVars, consts: tConsts, projects: tProjects, bundle: tBundle }[st.tab]();
  ctx.view().innerHTML = `<div class="card row" id="settings">${TABS.map(([k, t]) => `<button class="${st.tab === k ? '' : 'sec'}" data-act="sTab" data-k="${k}">${t}</button>`).join('')}</div>${body}`;
}
function tLists() {
  const O = origLabels(), ls = cfg.lists, cur = listById(st.list) || ls[0]; st.list = cur?.id || null;
  return `<div class="card"><h2>القوائم المدمجة</h2><p class="small">تسميات الفئات والجنس وأنماط الجلسة تظهر في كل البرنامج وفي تصدير PTT (الإنجليزية). المفاتيح الداخلية ثابتة لأن قالب Annex 5 يعتمد عليها؛ تُعدَّل التسمية فقط.</p>
  <h3>الفئات المستهدفة</h3><table><tr><th>المفتاح</th><th>عربي</th><th>English (يُستعمل في تصدير PTT)</th></tr>${GROUP_KEYS().map((k) => `<tr><td data-notr>${k}</td><td><input data-s="groupAr.${k}" value="${esc(GROUPS[k])}" placeholder="${esc(O.groups[k])}"></td><td><input data-s="groupEn.${k}" dir="ltr" value="${esc(cfg.groupEn[k] || '')}" placeholder="${esc(GROUP_EN_DEF[k])}"></td></tr>`).join('')}</table>
  <div class="row"><label>ذكر<input data-s="sexAr.M" value="${esc(SEX.M)}"></label><label>أنثى<input data-s="sexAr.F" value="${esc(SEX.F)}"></label><label>كشف أسماء<input data-s="modesAr.roll" value="${esc(SESSION_MODES.roll)}"></label><label>أعداد فقط<input data-s="modesAr.counts" value="${esc(SESSION_MODES.counts)}"></label></div>
  <h3>أنواع الإعاقة (قائمة الاختيار في كشوف الحضور)</h3><textarea id="sdt" rows="5" style="width:260px">${esc(DTYPES.join('\n'))}</textarea><div class="row"><button class="sec" data-act="sDtSave">حفظ القائمة</button><button class="sec" data-act="sDtReset">استعادة الأصلية</button></div>
  <p class="small">السجلات القديمة تحتفظ بنصها الأصلي؛ التعديل يغيّر خيارات الإدخال الجديد فقط.</p></div>
  <div class="card"><h2>القوائم المخصصة</h2><p class="small">قوائم اختيار تبنيها بنفسك (مثل الأحياء، جهات الإحالة، أنواع المواد…) وتُستعمل في منشئ الاستبيانات، وتُصدَّر وتُستورد بصيغة <b>choices</b> المتوافقة مع XLSForm/KoBo.</p>
  <div class="row"><label>القائمة<select id="slist">${ls.map((l) => `<option value="${l.id}" ${l.id === cur?.id ? 'selected' : ''}>${esc(l.ar || l.name)} (${l.items.length})</option>`).join('') || '<option value="">— لا قوائم —</option>'}</select></label>
  <button data-act="sNewList">+ قائمة جديدة</button>${cur ? '<button class="x" data-act="sDelList">حذف القائمة</button>' : ''}</div>
  ${cur ? `<div class="row"><label>الاسم (عربي)<input data-sl="ar" value="${esc(cur.ar)}"></label><label>المعرّف (لاتيني، لـ XLSForm)<input data-sl="name" dir="ltr" value="${esc(cur.name)}"></label></div>
  <table><tr><th>القيمة</th><th>عربي</th><th>English</th><th></th></tr>${cur.items.map((i, k) => `<tr><td><input data-si="${k}.v" dir="ltr" value="${esc(i.v)}" style="width:110px"></td><td><input data-si="${k}.ar" value="${esc(i.ar)}"></td><td><input data-si="${k}.en" dir="ltr" value="${esc(i.en)}"></td><td><button class="sec" data-act="sUp" data-i="${k}">↑</button><button class="x" data-act="sDelItem" data-i="${k}">✕</button></td></tr>`).join('')}</table>
  <div class="row"><button data-act="sAddItem">+ بند</button></div>` : ''}
  <div class="row" style="margin-top:.6rem"><button class="sec" data-act="sListsXls">تصدير كل القوائم (Excel — choices)</button><label>استيراد<input type="file" id="slfile" accept=".xlsx,.csv"></label><button class="sec" data-act="sListsImp">استيراد ودمج</button></div><p id="smsg2" class="small"></p></div>`;
}
function tVars() {
  return `<div class="card"><h2>المتغيرات</h2><p class="small">قيم تضبط قواعد التحقق في كشوف الحضور. الفارغ يعني القيمة الافتراضية.</p>
  <table><tr><th>المتغير</th><th>القيمة</th><th>الافتراضي</th><th></th></tr>${VARS.map((v) => `<tr><td>${v.ar}<div class="small">${v.help}</div></td><td><input type="number" data-sv="${v.key}" min="${v.min}" max="${v.max}" step="${v.step}" value="${cfg.vars[v.key] ?? ''}" placeholder="${v.def}" style="width:90px"></td><td>${v.def}</td><td>${hasVar(v.key) ? `<button class="sec" data-act="sVarReset" data-k="${v.key}">استعادة</button>` : ''}</td></tr>`).join('')}</table>
  <div class="row"><button class="sec" data-act="sVarsReset">استعادة كل الافتراضيات</button></div></div>`;
}
function tConsts() {
  return `<div class="card"><h2>الثوابت</h2><p class="small">قيم مرتبطة ببنية قالب Annex 5 والحسابات، فلا تُعدَّل من الواجهة (تغييرها يكسر مطابقة PTT). تُعرض للاطلاع والتوثيق.</p>
  <h3>الفئات العمرية (أعمدة PTT)</h3><table><tr><th>المفتاح</th><th>من</th><th>إلى</th><th>عمود القالب</th></tr>${AGE_BANDS.map((b) => `<tr><td>${b.key}</td><td>${b.min}</td><td>${b.max}</td><td>${b.col}</td></tr>`).join('')}</table>
  <h3>تصنيفات الحضور</h3><p>${CATS.map((c) => `<span class="badge b-info">${c}</span>`).join(' ')}</p>
  <h3>مراحل القياس</h3><p>${ROUNDS.map(([k, ar, en]) => `<span class="badge b-info">${k}: ${esc(ar)} / ${esc(en)}</span>`).join(' ')}</p>
  <h3>مقاييس الاستبيانات</h3><table><tr><th>المقياس</th><th>الخيارات</th></tr>${Object.keys(SCALES).map((k) => `<tr><td>${esc(SCALE_NAMES[k] || k)}</td><td>${SCALES[k].map((x) => esc(x[1])).join(' / ')}</td></tr>`).join('')}</table></div>`;
}
const counts = (id) => ({ s: ctx.db.sessions.filter((x) => x.projectId === id).length, sh: ctx.db.sheets.filter((x) => x.projectId === id).length, o: ctx.db.ops.filter((x) => x.projectId === id).length, r: ctx.db.surveyResponses.filter((x) => x.projectId === id).length });
function tProjects() {
  const ps = ctx.db.projects;
  return `<div class="card"><h2>المشاريع</h2><table><tr><th>المشروع</th><th>الممول</th><th>المدة</th><th>جلسات</th><th>كشوفات</th><th>إنجاز</th><th>ردود</th><th></th></tr>${ps.map((p) => { const c = counts(p.id); return `<tr><td>${esc(p.name)}${p.demo ? ' <span class="badge b-warn">تجريبي</span>' : ''}</td><td>${esc(p.donor)}</td><td>${p.start} → ${p.end}</td><td>${c.s}</td><td>${c.sh}</td><td>${c.o}</td><td>${c.r}</td><td><button class="sec" data-act="sPExp" data-id="${p.id}">تصدير حزمة</button> <button class="sec" data-act="sPDup" data-id="${p.id}">نسخ الهيكل</button> <button class="x" data-act="sPDel" data-id="${p.id}">حذف</button></td></tr>`; }).join('') || '<tr><td colspan="8">لا مشاريع</td></tr>'}</table>
  <p class="small">«تصدير حزمة» يحفظ المشروع وكل بياناته (جلسات، كشوفات، إنجاز، ردود، المستفيدون والمراكز المرتبطون) في ملف JSON يمكن استيراده على جهاز آخر. «نسخ الهيكل» ينشئ مشروعًا جديدًا بنفس الأنشطة والمؤشرات بلا بيانات.</p>
  <div class="row"><label>استيراد حزمة مشروع<input type="file" id="spfile" accept=".json"></label><button data-act="sPImp">استيراد</button></div><p id="smsg3" class="small"></p></div>`;
}
function tBundle() {
  return `<div class="card"><h2>حزمة الإعدادات</h2><p class="small">ملف واحد يحوي: تسميات القوائم، القوائم المخصصة، المتغيرات، وقاموس الترجمة المخصص. استخدمه لنقل إعداداتك بين الأجهزة أو لتوحيدها بين الفريق. لا يحوي أي بيانات مشاريع أو مستفيدين.</p>
  <div class="row"><button data-act="sBExp">تصدير الإعدادات (JSON)</button><label>استيراد<input type="file" id="sbfile" accept=".json"></label><button class="sec" data-act="sBImp">استيراد وتطبيق</button></div><p id="smsg4" class="small"></p></div>`;
}
const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; for (const k of ks.slice(0, -1)) x = x[k] ||= {}; x[ks.at(-1)] = v; };
function projectPackage(id) {
  const db = ctx.db, p = db.projects.find((x) => x.id === id), by = (c) => db[c].filter((x) => x.projectId === id), ss = by('sessions'), sh = by('sheets'), ops = by('ops'), rs = by('surveyResponses'), en = by('enrollments');
  const bn = new Set([...ss.flatMap((s) => s.attendance || []), ...sh.flatMap((x) => [...(x.roster || []), ...(x.rosterP || [])]), ...rs.map((r) => r.bnfId).filter(Boolean), ...en.map((e) => e.beneficiaryId)]);
  const ctr = new Set([...ss.map((s) => s.centerId), ...sh.map((x) => x.centerId), ...ops.map((o) => o.centerId)].filter(Boolean));
  return { app: 'nawa-project', v: 1, at: new Date().toISOString(), project: p, centers: db.centers.filter((c) => ctr.has(c.id)), beneficiaries: db.beneficiaries.filter((b) => bn.has(b.id)), sessions: ss, sheets: sh, ops, surveyResponses: rs, enrollments: en };
}
function upsert(arr, rows) { let n = 0; for (const r of rows || []) { const i = arr.findIndex((x) => x.id === r.id); if (i >= 0) arr[i] = r; else { arr.push(r); n++; } } return n; }
export function settingsActions({ toast, dl, go, save, rerender, ui, ask }) {
  const msg = (id, m) => { const e = $(id); if (e) e.textContent = m; toast(m); };
  const persist = () => { saveConfig(); };
  document.addEventListener('change', (e) => {
    const t = e.target, d = t.dataset || {}; if (!t.closest?.('#view') || !$('#settings')) return;
    if (d.s) { const [grp, key] = d.s.split('.'); const v = t.value.trim(); if (grp === 'groupEn') { if (v) cfg.groupEn[key] = v; else delete cfg.groupEn[key]; } else { (cfg[grp] ||= {})[key] = v; if (!v) delete cfg[grp][key]; } persist(); toast('حُفظ'); }
    else if (d.sv) { cfg.vars[d.sv] = t.value === '' ? '' : Number(t.value); persist(); vSettings(); }
    else if (d.sl) { const l = listById(st.list); l[d.sl] = d.sl === 'name' ? slug(t.value) || l.name : t.value; persist(); vSettings(); }
    else if (d.si) { const [k, f] = d.si.split('.'); listById(st.list).items[+k][f] = t.value.trim(); persist(); }
    else if (t.id === 'slist') { st.list = t.value; vSettings(); }
  });
  return {
    sTab(t) { st.tab = t.dataset.k; vSettings(); },
    sDtSave() { cfg.dtypes = $('#sdt').value.split('\n').map((x) => x.trim()).filter(Boolean); persist(); vSettings(); toast('حُفظت قائمة الإعاقة'); },
    sDtReset() { cfg.dtypes = null; persist(); vSettings(); },
    async sNewList() { const n = (await ctx.askText('اسم القائمة (عربي)'))?.trim(); if (!n) return; const l = { id: uid('l'), name: slug(n) || 'list_' + (cfg.lists.length + 1), ar: n, items: [] }; cfg.lists.push(l); st.list = l.id; persist(); vSettings(); },
    async sDelList() { const l = listById(st.list); if (!l || !(await ask(`حذف القائمة «${l.ar}» وبنودها؟ (الاستبيانات التي استعملتها تحتفظ بنسختها)`))) return; cfg.lists = cfg.lists.filter((x) => x !== l); st.list = null; persist(); vSettings(); },
    sAddItem() { const l = listById(st.list); if (!l) return; l.items.push({ v: String(l.items.length + 1), ar: '', en: '' }); persist(); vSettings(); },
    sDelItem(t) { listById(st.list).items.splice(+t.dataset.i, 1); persist(); vSettings(); },
    sUp(t) { const a = listById(st.list).items, i = +t.dataset.i; if (i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]]; persist(); vSettings(); },
    async sListsXls() {
      const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('choices'); ws.addRow(['list_name', 'name', 'label::Arabic (ar)', 'label::English (en)']); listsToRows().forEach((r) => ws.addRow(r));
      ws.eachRow((r, i) => r.eachCell((c) => { c.font = { name: 'Sakkal Majalla', size: 13, bold: i === 1 }; })); ws.columns.forEach((c) => (c.width = 28)); dl(await wb.xlsx.writeBuffer(), 'nawa-lists.xlsx', XL);
    },
    async sListsImp() {
      const f = $('#slfile').files[0]; if (!f) return toast('اختر ملفًا'); let rows = [];
      if (/\.csv$/i.test(f.name)) rows = (await f.text()).split(/\r?\n/).map((l) => l.split(',')).slice(1);
      else { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.getWorksheet('choices') || wb.worksheets[0], v = (r, k) => { const x = r.getCell(k).value; return String(x?.result ?? x?.text ?? x ?? '').trim(); }; ws.eachRow((r, i) => { if (i > 1) rows.push([v(r, 1), v(r, 2), v(r, 3), v(r, 4)]); }); }
      const r = rowsToLists(rows); persist(); vSettings(); msg('#smsg2', `أُضيف ${r.add} وحُدّث ${r.upd}`);
    },
    sVarReset(t) { delete cfg.vars[t.dataset.k]; persist(); vSettings(); },
    sVarsReset() { cfg.vars = {}; persist(); vSettings(); },
    sPExp(t) { const p = projectPackage(t.dataset.id); dl(JSON.stringify(p, null, 1), `nawa-project-${(p.project.name || 'p').slice(0, 30)}.json`, 'application/json'); },
    sPDup(t) { const src = ctx.db.projects.find((p) => p.id === t.dataset.id), c = JSON.parse(JSON.stringify(src)); c.id = uid('p'); c.name += ' (نسخة)'; delete c.demo; ctx.db.projects.push(c); ui.projectId = c.id; save(); toast('نُسخ هيكل المشروع'); go('projects'); },
    async sPDel(t) {
      const id = t.dataset.id, p = ctx.db.projects.find((x) => x.id === id), c = counts(id); if (!(await ask(`حذف «${p.name}» نهائيًا مع ${c.s} جلسة و${c.sh} كشفًا و${c.o} إنجازًا و${c.r} ردًا؟ يُنصح بتصدير حزمة قبل الحذف.`))) return;
      const db = ctx.db; db.projects = db.projects.filter((x) => x.id !== id); for (const k of ['sessions', 'sheets', 'ops', 'surveyResponses', 'enrollments']) db[k] = db[k].filter((x) => x.projectId !== id);
      if (ui.projectId === id) ui.projectId = db.projects[0]?.id || null; save(); vSettings(); toast('حُذف المشروع');
    },
    async sPImp() {
      const f = $('#spfile').files[0]; if (!f) return toast('اختر ملفًا'); let j; try { j = JSON.parse(await f.text()); } catch { return toast('ملف غير صالح'); } if (j.app !== 'nawa-project' || !j.project) return toast('ليس حزمة مشروع');
      const db = ctx.db, ex = db.projects.some((p) => p.id === j.project.id); if (ex && !(await ask(`المشروع «${j.project.name}» موجود. سيُستبدل بما في الحزمة (السجلات ذات المعرّف نفسه تُحدَّث). متابعة؟`))) return;
      const i = db.projects.findIndex((p) => p.id === j.project.id); if (i >= 0) db.projects[i] = j.project; else db.projects.push(j.project);
      const n = { centers: upsert(db.centers, j.centers), beneficiaries: upsert(db.beneficiaries, j.beneficiaries), sessions: upsert(db.sessions, j.sessions), sheets: upsert(db.sheets, j.sheets), ops: upsert(db.ops, j.ops), surveyResponses: upsert(db.surveyResponses, j.surveyResponses), enrollments: upsert(db.enrollments, j.enrollments) };
      ui.projectId = j.project.id; save(); vSettings(); msg('#smsg3', `استُورد «${j.project.name}»: ${n.sessions} جلسة جديدة، ${n.sheets} كشف، ${n.beneficiaries} مستفيد`);
    },
    sBExp() { dl(JSON.stringify({ app: 'nawa-settings', v: 1, at: new Date().toISOString(), config: configJSON(), glossary: gl.entries }, null, 1), 'nawa-settings.json', 'application/json'); },
    async sBImp() {
      const f = $('#sbfile').files[0]; if (!f) return toast('اختر ملفًا'); let j; try { j = JSON.parse(await f.text()); } catch { return toast('ملف غير صالح'); } if (j.app !== 'nawa-settings') return toast('ليس ملف إعدادات');
      if (!(await ask('سيحلّ هذا محلّ القوائم والمتغيرات الحالية ويُدمج قاموس الترجمة. متابعة؟'))) return;
      loadConfig(j.config, DTYPES); await kvSet('config', configJSON()); const g = mergePairs(j.glossary || []); vSettings(); msg('#smsg4', `طُبّقت الإعدادات (ترجمات: +${g.add}، محدّثة ${g.upd})`);
    },
  };
}
