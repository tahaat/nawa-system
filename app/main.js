import Chart from 'chart.js/auto';
import { db, ui, sync, saveHandle, load, save, project, backupJSON, restoreJSON } from './store.js';
import { createSync } from '../core/sync.js';
import { createFolderSync } from '../core/sync-folder.js';
import { dirFromHandle, folderSupported } from './fsdir.js';
import { TEMPLATES, allForms, buildForm, xlsformBuffer } from '../core/forms.js';
import { initBuilder, builderCard } from './form-builder.js';
import { importResponses, computeOutcomes } from '../core/outcomes.js';
import { france } from './sim_france.js';
import { vPlan, initPlan } from './plan-view.js';
import { purgeDemo, uid, GROUPS, AGE_BANDS, ageAt, bandOf, iso } from '../core/model.js';
import { dashboard, sttRows, sessionCats, sumCats, context } from '../core/aggregate.js';
import { validateEntry, reconcile } from '../core/validate.js';
import { exportPTT } from '../core/ptt-export.js';
import { exportSTT, exportBTT, exportSummary } from '../core/xlsx-export.js';
import ExcelJS from 'exceljs';
import logoUrl from './logo.png?inline';
import pttTemplate from '../assets/ptt.xlsx?inline';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const view = () => $('#view');
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => (t.style.display = 'none'), 3500); };
const ROUTES = { dash: ['لوحة القيادة', vDash], sessions: ['الجلسات (STT)', vSessions], bnf: ['المستفيدون (BTT)', vBnf], projects: ['المشاريع (PTT)', vProjects], plan: ['ملف PTT الكامل', vPlan], centers: ['المراكز', vCenters], check: ['التحقق والتكامل', vCheck], surveys: ['الاستبيانات (KoBo)', vSurveys], users: ['المستخدمون والصلاحيات', vUsers], cloud: ['السحابة والمزامنة', vCloud], export: ['التصدير والنسخ', vExport] };
const me = () => sync.cfg.me || null;
const allowed = (r) => { const p = me()?.policy; if (r === 'users') return !!p?.manageUsers; return !p || p.routes === '*' || p.routes.includes(r); };
const myCenters = () => { const x = me(); return x?.role === 'coordinator' || x?.policy?.write?.sessions === 'own' ? db.centers.filter((c) => x.centers.includes(c.id)) : db.centers; };
let route = 'dash', charts = [], sess = { mode: 'roll', att: new Set(), q: '', bands: false };

function nav() {
  $('#nav').innerHTML = Object.entries(ROUTES).filter(([k]) => allowed(k)).map(([k, [t]]) => `<a data-go="${k}" class="${k === route ? 'on' : ''}">${t}</a>`).join('');
  const opts = db.projects.map((p) => `<option value="${p.id}" ${p.id === ui.projectId ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  $('#top').innerHTML = `<h1>${ROUTES[route][0]}</h1><label>المشروع<select id="pj">${opts || '<option>— لا مشاريع —</option>'}</select></label>`;
}
function go(r) { if (!allowed(r)) r = 'dash'; route = r; charts.forEach((c) => c.destroy()); charts = []; nav(); ROUTES[r][1](); }
const rerender = () => go(route);

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-go],[data-act]'); if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  const f = actions[t.dataset.act]; if (f) { try { await f(t, e); } catch (err) { console.error(err); toast('خطأ: ' + err.message); } }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'pj') { ui.projectId = e.target.value; save(); rerender(); }
  const b = e.target.dataset?.bind; if (b) bind(e.target);
});
function bind(el) { // data-bind="list|idx|field"  أو "obj|field"
  const [a, b, c] = el.dataset.bind.split('|'); const p = project(); let tgt, key;
  if (c !== undefined) { tgt = p[a][+b]; key = c; } else { tgt = a === 'p' ? p : p[a]; key = b; }
  let v = el.type === 'number' ? (el.value === '' ? null : +el.value) : el.multiple ? [...el.selectedOptions].map((o) => o.value) : el.value;
  tgt[key] = v; save(); if (el.dataset.re) rerender();
}

// ======================= لوحة القيادة =======================
function vDash() {
  const p = project(); if (!p) return empty();
  const d = dashboard(p, db), rec = reconcile(db).filter((x) => x.level === 'error'), val = validateEntry(db);
  const nErr = val.filter((x) => x.level === 'error').length;
  view().innerHTML = `
  <div class="grid g4">
    <div class="card kpi"><b>${d.sessions}</b><span>جلسة منفذة</span></div>
    <div class="card kpi"><b>${d.attendance}</b><span>إجمالي الحضور</span></div>
    <div class="card kpi gold"><b>${d.directCount}</b><span>مستفيد مباشر (حسب تعريف المشروع)</span></div>
    <div class="card kpi gold"><b>${d.uniqueRolled}</b><span>أفراد فريدون بكشف الأسماء</span></div>
    <div class="card kpi"><b class="${rec.length + nErr ? '' : ''}">${rec.length + nErr ? rec.length + nErr : '✔'}</b><span>${rec.length + nErr ? 'ملاحظات تحتاج معالجة (انظر التحقق)' : 'الأدوات الثلاث متطابقة'}</span></div>
  </div>
  ${d.unclassified ? `<div class="card"><span class="badge b-warn">تنبيه</span> ${d.unclassified} مشارك بلا فئة عمرية (جلسات بالأعداد دون توزيع عمري) لا يدخلون في جدول الفئات العمرية.</div>` : ''}
  ${outcomeBlock(p)}
  <div class="grid g2">
    <div class="card"><h3>الحضور حسب الجنس والإعاقة</h3><canvas id="c1"></canvas></div>
    <div class="card"><h3>الأنشطة: المنفذ مقابل المخطط</h3><canvas id="c2"></canvas></div>
    <div class="card"><h3>الجلسات والحضور شهريًا</h3><canvas id="c3"></canvas></div>
    <div class="card"><h3>الفئات العمرية</h3><p class="small" style="margin:0">الأحمر: أفراد فريدون لكل ربع وبند (جلسات الأسماء). الذهبي: مشاركات جلسات الأعداد (غير فريدة).</p><canvas id="c4"></canvas></div>
    <div class="card"><h3>الحضور حسب المركز</h3><canvas id="c5"></canvas></div>
    <div class="card"><h3>الحضور حسب الفئة المستهدفة</h3><canvas id="c6"></canvas></div>
  </div>`;
  const RED = '#A21008', GOLD = '#E6A901', PINK = '#FF9798', DK = '#5b0a05', GR = '#9a8f8f';
  const mk = (id, cfg) => { const c = new Chart($('#' + id), { ...cfg, options: { responsive: true, plugins: { legend: { labels: { font: { family: 'Sakkal Majalla', size: 15 } } } }, scales: cfg.type === 'doughnut' ? {} : { x: { ticks: { font: { family: 'Sakkal Majalla', size: 14 } } }, y: { beginAtZero: true } }, ...(cfg.opt || {}) }, data: cfg.data }); charts.push(c); };
  mk('c1', { type: 'doughnut', data: { labels: ['ذكور', 'إناث', 'ذكور (إعاقة)', 'إناث (إعاقة)'], datasets: [{ data: [d.cats.M, d.cats.F, d.cats.CWD_M, d.cats.CWD_F], backgroundColor: [RED, PINK, GOLD, DK] }] } });
  const an = Object.keys(d.byAct);
  mk('c2', { type: 'bar', data: { labels: an, datasets: [{ label: 'منفذ', data: an.map((k) => d.byAct[k].sessions), backgroundColor: RED }, { label: 'مخطط', data: an.map((k) => d.byAct[k].planned), backgroundColor: GOLD }] } });
  const ml = Array.from({ length: 12 }, (_, i) => { const x = new Date(Date.UTC(+p.start.slice(0, 4), +p.start.slice(5, 7) - 1 + i, 1)); return x.toISOString().slice(0, 7); });
  mk('c3', { type: 'line', data: { labels: ml, datasets: [{ label: 'الحضور', data: d.byMonth.map((m) => m.att), borderColor: RED, backgroundColor: RED }, { label: 'الجلسات', data: d.byMonth.map((m) => m.sessions), borderColor: GOLD, backgroundColor: GOLD }] } });
  mk('c4', { type: 'bar', data: { labels: AGE_BANDS.map((b) => b.key), datasets: [{ label: 'أفراد فريدون (أسماء)', data: d.byBand.map((n, i) => n - d.byBandCounts[i]), backgroundColor: PINK, borderColor: RED, borderWidth: 1 }, { label: 'مشاركات (أعداد)', data: d.byBandCounts, backgroundColor: GOLD, borderColor: GOLD, borderWidth: 1 }] }, options: { scales: { x: { stacked: true }, y: { stacked: true } } } });
  const cn = Object.keys(d.byCenter);
  mk('c5', { type: 'bar', data: { labels: cn, datasets: [{ label: 'الحضور', data: cn.map((k) => d.byCenter[k].att), backgroundColor: RED }, { label: 'الجلسات', data: cn.map((k) => d.byCenter[k].sessions), backgroundColor: GOLD }] } });
  const gk = Object.keys(d.byGroup);
  mk('c6', { type: 'doughnut', data: { labels: gk.map((k) => GROUPS[k] || k), datasets: [{ data: gk.map((k) => d.byGroup[k]), backgroundColor: [RED, GOLD, PINK, DK, GR] }] } });
}
function outcomeBlock(p) {
  const os = computeOutcomes(p, db); if (!os.length) return '';
  const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : '—');
  return `<div class="card"><h3>مؤشرات النتائج (من الاستبيانات)</h3><table><tr><th>المؤشر</th><th>ذكور</th><th>إناث</th><th>ذكور (إعاقة)</th><th>إناث (إعاقة)</th><th>الإجمالي</th></tr>${os.map((o) => { const N = { M: 0, F: 0, CWD_M: 0, CWD_F: 0 }, D = { ...N }; o.quarters.forEach((q) => Object.keys(N).forEach((k) => { N[k] += q.N[k]; D[k] += q.D[k]; })); const tn = Object.values(N).reduce((a, b) => a + b, 0), td = Object.values(D).reduce((a, b) => a + b, 0);
    return `<tr><td>${esc(o.ind.name)}${o.issues.length ? ` <span class="badge b-warn" title="${esc(o.issues.slice(0, 5).join(' | '))}">${o.issues.length}</span>` : ''}</td>${['M', 'F', 'CWD_M', 'CWD_F'].map((k) => `<td>${N[k]}/${D[k]} (${pct(N[k], D[k])})</td>`).join('')}<td><b>${tn}/${td} (${pct(tn, td)})</b></td></tr>`; }).join('')}</table></div>`;
}
const hasDemo = () => ['projects', 'centers', 'beneficiaries', 'sessions', 'surveyResponses'].some((k) => db[k].some((r) => r.demo));
const empty = () => (view().innerHTML = `<div class="card"><h2>ابدأ</h2><p>لا يوجد مشروع بعد.</p><button data-act="newProject">إنشاء مشروع</button> <button class="sec" data-act="demo">تحميل مشروع تجريبي</button></div>`);

// ======================= المشاريع =======================
const sel = (opts, v) => opts.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('');
function vProjects() {
  const p = project(); if (!p) return empty();
  const iv = p.interventions.map((i) => [i.id, `${i.result} — ${i.name}`]);
  view().innerHTML = `
  <div class="card row"><button data-act="newProject">+ مشروع جديد</button><button class="sec" data-act="demo">مشروع تجريبي</button>${hasDemo() ? '<button class="x" data-act="purgeDemo">مسح بيانات المحاكاة كلها</button>' : ''}<button class="sec" data-act="delProject">حذف هذا المشروع</button></div>
  <div class="card"><h2>بيانات المشروع</h2><div class="row">
    <label>الاسم<input data-bind="p|name" value="${esc(p.name)}" style="width:280px"></label>
    <label>الممول<input data-bind="p|donor" value="${esc(p.donor)}"></label>
    <label>البداية<input type="date" data-bind="p|start" value="${p.start}" data-re="1"></label>
    <label>النهاية<input type="date" data-bind="p|end" value="${p.end}"></label></div>
    <p class="small">قالب PTT يغطي 12 شهرًا من تاريخ البداية؛ الجلسات خارجها تظهر في النظام ولا تظهر في الملف المصدَّر.</p>
    <h3>تعريف «المستفيد المباشر»</h3><div class="row">
      <label>الطريقة<select data-bind="directRule|mode" data-re="1">${sel([['once', 'حضور جلسة واحدة'], ['threshold', 'حد أدنى للحضور / نسبة'], ['manual', 'يدوي (تحديد من السجل)']], p.directRule?.mode)}</select></label>
      ${p.directRule?.mode === 'threshold' ? `<label>أقل عدد جلسات<input type="number" min="1" data-bind="directRule|minSessions" value="${p.directRule.minSessions ?? 1}" style="width:90px"></label><label>أو نسبة % من جلسات النشاط<input type="number" min="0" max="100" data-bind="directRule|minPct" value="${p.directRule.minPct ?? 0}" style="width:90px"></label>` : ''}</div></div>
  <div class="card"><h2>بنود تفصيل المستفيدين (حتى 5)</h2><p class="small">كل بند يظهر كصف في جدول «Beneficiaries Breakdown».</p>
  <table><tr><th>النتيجة</th><th>اسم البند</th><th>الفئة</th><th></th></tr>${p.interventions.map((i, k) => `<tr>
    <td><select data-bind="interventions|${k}|result">${sel(['R1', 'R2', 'R3'].map((x) => [x, x]), i.result)}</select></td>
    <td><input data-bind="interventions|${k}|name" value="${esc(i.name)}" style="width:100%"></td>
    <td><select data-bind="interventions|${k}|group">${sel(Object.entries(GROUPS), i.group)}</select></td>
    <td><button class="x" data-act="delIv" data-i="${k}">حذف</button></td></tr>`).join('')}</table>
  <button class="sec" data-act="addIv" ${p.interventions.length >= 5 ? 'disabled' : ''}>+ بند</button></div>
  <div class="card"><h2>الأنشطة</h2><div class="tw"><table><tr><th>النشاط</th><th>النوع</th><th>البند</th><th>الفئة</th><th>عمر من</th><th>إلى</th><th>جلسات مخططة</th><th>أشهر الخطة (من–إلى)</th><th></th></tr>${p.activities.map((a, k) => `<tr>
    <td><input data-bind="activities|${k}|name" value="${esc(a.name)}"></td><td><input data-bind="activities|${k}|type" value="${esc(a.type)}" style="width:100px"></td>
    <td><select data-bind="activities|${k}|interventionId">${sel(iv, a.interventionId)}</select></td>
    <td><select data-bind="activities|${k}|group">${sel(Object.entries(GROUPS), a.group)}</select></td>
    <td><input type="number" style="width:60px" data-bind="activities|${k}|ageMin" value="${a.ageMin ?? ''}"></td><td><input type="number" style="width:60px" data-bind="activities|${k}|ageMax" value="${a.ageMax ?? ''}"></td>
    <td><input type="number" style="width:80px" data-bind="activities|${k}|plannedSessions" value="${a.plannedSessions ?? ''}"></td>
    <td>${planMonths(a, k)}</td><td><button class="x" data-act="delAct" data-i="${k}">حذف</button></td></tr>`).join('')}</table></div>
  <button class="sec" data-act="addAct" ${!p.interventions.length ? 'disabled title="أضف بندًا أولًا"' : ''}>+ نشاط</button></div>
  <div class="card"><h2>مؤشرات المخرجات (Output indicators)</h2><table><tr><th>المخرج</th><th>المؤشر</th><th>الأنشطة المحتسبة</th><th>طريقة العد</th><th></th></tr>${p.outputIndicators.map((o, k) => `<tr>
    <td><select data-bind="outputIndicators|${k}|output">${sel(['output 1', 'output 2', 'output 3'].map((x) => [x, x]), o.output)}</select></td>
    <td><input data-bind="outputIndicators|${k}|name" value="${esc(o.name)}" style="width:100%"></td>
    <td><select multiple size="3" data-bind="outputIndicators|${k}|activityIds">${p.activities.map((a) => `<option value="${a.id}" ${o.activityIds.includes(a.id) ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></td>
    <td><select data-bind="outputIndicators|${k}|measure">${sel([['unique', 'أفراد فريدون في الشهر'], ['sessions-attendance', 'مشاركات (كل حضور)']], o.measure)}</select></td>
    <td><button class="x" data-act="delOut" data-i="${k}">حذف</button></td></tr>`).join('')}</table><button class="sec" data-act="addOut">+ مؤشر</button>
  <p class="small">قيود القالب: output 1 = 3 مؤشرات، output 2 = 4، output 3 = 6.</p></div>
  <div class="card"><h2>مؤشرات النتائج (Outcome indicators)</h2><p class="small">تُحسب من ردود الاستبيانات وتُكتب في ورقة Outcome indicators (البسط والمقام لكل ربع وفئة).</p>
  <table><tr><th>الصف</th><th>المؤشر</th><th>الاستبيان</th><th>النوع</th><th>الحد (% من الدرجة)</th><th>المرحلة</th><th></th></tr>${(p.outcomeIndicators || []).map((o, k) => `<tr>
    <td><select data-bind="outcomeIndicators|${k}|row">${sel([4, 5, 7, 8, 9, 10, 11, 12].map((x) => [x, x === 4 || x === 5 ? 'هدف عام ' + x : 'نتيجة ' + x]), String(o.row))}</select></td>
    <td><input data-bind="outcomeIndicators|${k}|name" value="${esc(o.name)}" style="width:100%"></td>
    <td><select data-bind="outcomeIndicators|${k}|formId">${sel(allForms(p).map((t) => [t.id, t.ar]), o.formId)}</select></td>
    <td><select data-bind="outcomeIndicators|${k}|kind" data-re="1">${sel([['threshold', 'نسبة من تجاوز حدًّا'], ['improvement', 'نسبة من تحسّنت درجته (قبلي→بعدي)']], o.kind)}</select></td>
    <td>${o.kind === 'improvement' ? `<input type="number" style="width:70px" data-bind="outcomeIndicators|${k}|minGain" value="${o.minGain ?? 1}" title="أقل مكسب بالدرجات">` : `<input type="number" style="width:70px" data-bind="outcomeIndicators|${k}|valuePct" value="${o.valuePct ?? 70}">`}</td>
    <td><select data-bind="outcomeIndicators|${k}|round">${sel(['endline', 'baseline', 'followup'].map((x) => [x, x]), o.round || 'endline')}</select></td>
    <td><button class="x" data-act="delOutc" data-i="${k}">حذف</button></td></tr>`).join('')}</table><button class="sec" data-act="addOutc">+ مؤشر نتائج</button></div>`;
}
const planMonths = (a, k) => { const m = a.planMonths || [0, 11]; const o = (v) => Array.from({ length: 12 }, (_, i) => `<option value="${i}" ${i === v ? 'selected' : ''}>${i + 1}</option>`).join(''); return `<select class="pm" data-i="${k}" data-w="0">${o(m[0])}</select> – <select class="pm" data-i="${k}" data-w="1">${o(m[1])}</select>`; };
document.addEventListener('change', (e) => { if (e.target.classList?.contains('pm')) { const a = project().activities[+e.target.dataset.i]; a.planMonths = a.planMonths || [0, 11]; a.planMonths[+e.target.dataset.w] = +e.target.value; save(); } });

// ======================= المراكز =======================
function vCenters() {
  view().innerHTML = `<div class="card"><div class="row"><label>اسم المركز<input id="cn"></label><button data-act="addCenter">+ إضافة</button></div>
  <table><tr><th>المركز</th><th>جلسات</th><th></th></tr>${db.centers.map((c) => `<tr><td>${esc(c.name)}</td><td>${db.sessions.filter((s) => s.centerId === c.id).length}</td><td><button class="x" data-act="delCenter" data-id="${c.id}">حذف</button></td></tr>`).join('')}</table></div>`;
}

// ======================= المستفيدون =======================
let bq = '';
function vBnf() {
  const cx = context(db), list = db.beneficiaries.filter((b) => !bq || b.name.includes(bq) || (b.phone || '').includes(bq)).slice(0, 400);
  view().innerHTML = `
  <div class="card"><h2>إضافة مستفيد</h2><div class="row">
    <label>الاسم الرباعي<input id="bn" style="width:260px"></label><label>الجنس<select id="bs"><option value="M">ذكر</option><option value="F">أنثى</option></select></label>
    <label>العمر<input id="ba" type="number" style="width:80px"></label><label>أو تاريخ الميلاد<input id="bd" type="date"></label>
    <label>الإعاقة<select id="bdis"><option value="0">لا</option><option value="1">نعم</option></select></label><label>النوع<input id="bdt" style="width:110px"></label>
    <label>الهاتف<input id="bp" style="width:130px"></label><button data-act="addBnf">+ إضافة</button></div>
    <div class="row" style="margin-top:10px"><label>استيراد من Excel (أعمدة: الاسم، العمر، الجنس، الإعاقة، الهاتف)<input type="file" id="bimp" accept=".xlsx"></label><button class="sec" data-act="impBnf">استيراد</button></div></div>
  <div class="card"><div class="row"><label>بحث<input id="bq" value="${esc(bq)}"></label><span class="small">${db.beneficiaries.length} مستفيد</span></div>
  <div class="tw"><table><tr><th>الاسم</th><th>الجنس</th><th>العمر</th><th>الفئة</th><th>إعاقة</th><th>الهاتف</th><th>جلسات حضور</th><th></th></tr>${list.map((b) => { const age = ageAt(b, iso(new Date())); const n = db.sessions.filter((s) => s.mode === 'roll' && s.attendance.includes(b.id)).length; return `<tr><td>${esc(b.name)}</td><td>${b.sex === 'M' ? 'ذكر' : 'أنثى'}</td><td>${age ?? '؟'}</td><td>${bandOf(age)?.key || '—'}</td><td>${b.disability ? esc(b.disabilityType || 'نعم') : ''}</td><td>${esc(b.phone || '')}</td><td>${n}</td><td><button class="x" data-act="delBnf" data-id="${b.id}">حذف</button></td></tr>`; }).join('')}</table></div></div>`;
  $('#bq').addEventListener('input', (e) => { bq = e.target.value; clearTimeout(vBnf.t); vBnf.t = setTimeout(() => { vBnf(); $('#bq').focus(); $('#bq').setSelectionRange(bq.length, bq.length); }, 300); });
}

// ======================= الجلسات =======================
function vSessions() {
  const p = project(); if (!p) return empty();
  const cx = context(db), acts = p.activities, a = acts.find((x) => x.id === sess.act) || acts[0]; sess.act = a?.id;
  const list = db.beneficiaries.filter((b) => !sess.q || b.name.includes(sess.q)).slice(0, 300);
  const today = iso(new Date());
  view().innerHTML = `
  <div class="card"><h2>جلسة جديدة</h2><div class="row">
    <label>النشاط<select id="sa">${acts.map((x) => `<option value="${x.id}" ${x.id === a?.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <label>المركز<select id="sc">${myCenters().map((c) => `<option value="${c.id}" ${c.id === sess.center ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label>التاريخ<input type="date" id="sd" value="${sess.date || today}"></label>
    <label>المنشّط<input id="se" value="${esc(sess.educator || '')}" list="eds"></label><label>المجموعة/الشعبة<input id="sg" value="${esc(sess.grp || '')}" placeholder="اختياري (أ، ب…)" style="width:110px"></label><datalist id="eds">${[...new Set(db.sessions.map((s) => s.educator).filter(Boolean))].map((e) => `<option>${esc(e)}</option>`).join('')}</datalist>
    <label>عدد وحدات الجلسة<input type="number" id="su" min="1" value="${sess.units || 1}" style="width:90px"></label></div>
  <div class="tabs" style="margin-top:12px"><button data-act="mode" data-m="roll" class="${sess.mode === 'roll' ? 'on' : ''}">كشف بالأسماء</button><button data-act="mode" data-m="counts" class="${sess.mode === 'counts' ? 'on' : ''}">أعداد فقط</button></div>
  ${sess.mode === 'roll' ? `<div class="row"><label>بحث في السجل<input id="sq" value="${esc(sess.q)}"></label><span class="small">المحدد: <b id="sel-n">${sess.att.size}</b> — ${a ? `فئة النشاط ${a.ageMin ?? '؟'}–${a.ageMax ?? '؟'} سنة` : ''}</span><button class="sec" data-act="quickBnf">+ مستفيد جديد سريع</button></div>
    <div class="roll">${list.map((b) => { const age = ageAt(b, sess.date || today), off = a && age != null && a.ageMin != null && (age < a.ageMin || age > a.ageMax); return `<label><input type="checkbox" data-att="${b.id}" ${sess.att.has(b.id) ? 'checked' : ''}> ${esc(b.name)} <span class="small">${age ?? '؟'}${off ? ' ⚠' : ''}</span></label>`; }).join('') || '<span class="small">السجل فارغ</span>'}</div>`
  : `<div class="row">${[['M', 'ذكور'], ['F', 'إناث'], ['MWD', 'ذكور (إعاقة)'], ['FWD', 'إناث (إعاقة)']].map(([k, t]) => `<label>${t}<input type="number" min="0" id="n-${k}" style="width:100px" value="${sess.counts?.[k] ?? ''}"></label>`).join('')}
    <label style="flex-direction:row;align-items:center"><input type="checkbox" id="bandsOn" ${sess.bands ? 'checked' : ''} data-act="toggleBands"> توزيع الفئات العمرية</label></div>
    ${sess.bands ? `<table><tr><th></th>${AGE_BANDS.map((b) => `<th>${b.key}</th>`).join('')}</tr>${[['M', 'ذكور'], ['F', 'إناث'], ['MWD', 'ذكور (إعاقة)'], ['FWD', 'إناث (إعاقة)']].map(([k, t]) => `<tr><td>${t}</td>${AGE_BANDS.map((b, i) => `<td><input type="number" min="0" style="width:60px" id="bd-${k}-${i}" value="${sess.bandCounts?.[k]?.[i] ?? ''}"></td>`).join('')}</tr>`).join('')}</table>` : '<p class="small">بدون توزيع عمري لن تظهر هذه الجلسة في جدول الفئات العمرية (يظهر تنبيه).</p>'}`}
  <div class="row" style="margin-top:10px"><label>ملاحظات<input id="sn" style="width:320px" value="${esc(sess.notes || '')}"></label><button data-act="saveSession">حفظ الجلسة</button><span id="sres"></span></div></div>
  <div class="card"><h2>آخر الجلسات</h2><div class="tw"><table><tr><th>التاريخ</th><th>النشاط</th><th>المركز</th><th>المنشّط</th><th>النمط</th><th>ذ</th><th>إ</th><th>ذ-إ</th><th>إ-إ</th><th>المجموع</th><th>تحقق</th><th></th></tr>
  ${db.sessions.filter((s) => s.projectId === p.id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 150).map((s) => { const c = sessionCats(s, cx), v = validateEntry({ ...db, sessions: [s] }).filter((i) => i.ref === s.id || i.ref === s.activityId); const lv = v.some((i) => i.level === 'error') ? 'error' : v.some((i) => i.level === 'warn') ? 'warn' : 'ok';
    return `<tr><td>${s.date}</td><td>${esc(cx.act.get(s.activityId)?.name)}</td><td>${esc(cx.ctr.get(s.centerId)?.name)}</td><td>${esc(s.educator)}</td><td>${s.mode === 'roll' ? 'أسماء' : 'أعداد'}</td><td>${c.M}</td><td>${c.F}</td><td>${c.CWD_M}</td><td>${c.CWD_F}</td><td><b>${sumCats(c)}</b></td><td><span class="badge b-${lv}" title="${esc(v.map((i) => i.msg).join(' | '))}">${lv === 'ok' ? '✔' : v.length}</span></td><td><button class="x" data-act="delSess" data-id="${s.id}">حذف</button></td></tr>`; }).join('')}</table></div></div>`;
  const rd = () => { sess.center = $('#sc')?.value; sess.date = $('#sd')?.value; sess.educator = $('#se')?.value; sess.grp = $('#sg')?.value; sess.units = +$('#su')?.value || 1; sess.notes = $('#sn')?.value; sess.act = $('#sa')?.value; if (sess.mode === 'counts') { sess.counts = Object.fromEntries(['M', 'F', 'MWD', 'FWD'].map((k) => [k, +$('#n-' + k)?.value || 0])); if (sess.bands) sess.bandCounts = Object.fromEntries(['M', 'F', 'MWD', 'FWD'].map((k) => [k, AGE_BANDS.map((_, i) => +$(`#bd-${k}-${i}`)?.value || 0)])); } };
  sess.rd = rd;
  $('#sa').onchange = () => { rd(); vSessions(); };
  $('#sd').onchange = () => { rd(); vSessions(); };
  const sq = $('#sq'); if (sq) sq.oninput = () => { rd(); sess.q = sq.value; clearTimeout(sess.t); sess.t = setTimeout(() => { vSessions(); const e = $('#sq'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); }, 300); };
  document.querySelectorAll('[data-att]').forEach((cb) => (cb.onchange = () => { cb.checked ? sess.att.add(cb.dataset.att) : sess.att.delete(cb.dataset.att); $('#sel-n').textContent = sess.att.size; }));
}

// ======================= التحقق =======================
function vCheck() {
  const v = validateEntry(db), r = reconcile(db), grp = (arr) => { const m = new Map(); for (const i of arr) { const k = i.level + i.code + i.msg; const e = m.get(k) || { ...i, n: 0 }; e.n++; m.set(k, e); } arr = [...m.values()].sort((a, b) => ['error', 'warn', 'info'].indexOf(a.level) - ['error', 'warn', 'info'].indexOf(b.level)); return arr.length ? `<table><tr><th>المستوى</th><th>الرمز</th><th>الملاحظة</th><th>التكرار</th></tr>${arr.slice(0, 500).map((i) => `<tr><td><span class="badge b-${i.level}">${{ error: 'خطأ', warn: 'تحذير', info: 'للعلم' }[i.level]}</span></td><td>${i.code}</td><td>${esc(i.msg)}</td><td>${i.n}</td></tr>`).join('')}</table>` : '<span class="badge b-ok">لا ملاحظات ✔</span>'; };
  view().innerHTML = `<div class="card"><h2>فحص التكامل بين الأدوات الثلاث</h2><p class="small">يتأكد أن STT = BTT = PTT = لوحة القيادة (الحضور، المؤشرات، الفئات العمرية، خطة العمل، المستفيد المباشر).</p>${grp(r)}</div>
  <div class="card"><h2>التحقق من الإدخال</h2>${grp(v)}</div>`;
}

// ======================= التصدير =======================
function vExport() {
  const p = project();
  view().innerHTML = `<div class="card"><h2>تصدير Excel</h2><div class="row">
   ${!me() || ['admin', 'meal'].includes(me().role) ? '<button data-act="xPTT">PTT — قالب Annex 5 معبأ</button>' : ''}<button data-act="xSTT" class="gold">STT — الجلسات</button><button data-act="xBTT" class="gold">BTT — المستفيدون</button><button data-act="xSum" class="sec">ملخص المشروع</button></div>
   <p class="small">PTT يُعبَّأ داخل القالب الأصلي (مع بقاء المخططات والمعادلات) وتُعاد حساباته عند فتحه في Excel.</p><div id="xw"></div></div>
  <div class="card"><h2>نسخة احتياطية</h2><div class="row"><button data-act="backup">حفظ نسخة JSON</button><label>استرجاع<input type="file" id="rf" accept=".json"></label><button class="sec" data-act="restore">استرجاع</button></div></div>`;
}
const dl = (data, name, type = 'application/octet-stream') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ======================= الاستبيانات =======================
function vSurveys() {
  const p = project(); if (!p) return empty(); const cnt = (id) => db.surveyResponses.filter((r) => r.formId === id);
  view().innerHTML = builderCard(p) + `<div class="card"><h2>كل النماذج (الجاهزة والمخصصة)</h2><p class="small">نزّل النموذج وارفعه في KoboToolbox (Deploy). كل نموذج يحوي رمز المستفيد ومرحلة القياس والمركز ودرجة كلية محسوبة، لربط الردّ بسجل المستفيدين.</p>
  <table><tr><th>النموذج</th><th>الفئة</th><th>الأسئلة</th><th>الردود</th><th></th></tr>${allForms(p).map((t) => `<tr><td>${esc(t.ar)}<div class="small">${esc(t.en)}</div></td><td>${{ child: 'أطفال', parent: 'أهالي', educator: 'منشّطون' }[t.audience]}</td><td>${(t.items || t.questions).length}</td><td>${cnt(t.id).length}</td><td><button data-act="dlForm" data-id="${t.id}">تنزيل XLSForm</button></td></tr>`).join('')}</table></div>
  <div class="card"><h2>استيراد الردود من KoBo</h2><p class="small">من KoBo: Data → Downloads → XLSX، بصيغة «قيم XML» (XML values and headers). يُتخطّى المكرر تلقائيًا.</p>
  <div class="row"><label>النموذج<select id="sf">${allForms(p).map((t) => `<option value="${t.id}">${esc(t.ar)}</option>`).join('')}</select></label><label>الملف<input type="file" id="sfile" accept=".xlsx"></label><button data-act="impResp">استيراد</button></div>
  <p id="smsg"></p></div>
  <div class="card"><h2>ملخص الردود</h2><table><tr><th>النموذج</th><th>المرحلة</th><th>عدد</th><th>متوسط الدرجة %</th></tr>${allForms(p).flatMap((t) => ['baseline', 'endline', 'followup', undefined].map((r) => [t, r])).map(([t, r]) => { const rs = cnt(t.id).filter((x) => (r ? x.round === r : false)); if (!rs.length) return ''; const sc = rs.filter((x) => x.score != null && x.max); return `<tr><td>${esc(t.ar)}</td><td>${r}</td><td>${rs.length}</td><td>${sc.length ? Math.round((100 * sc.reduce((a, x) => a + x.score / x.max, 0)) / sc.length) + '%' : '—'}</td></tr>`; }).join('')}</table></div>`;
}
// ======================= المستخدمون والصلاحيات =======================
const capi = async (path, method = 'GET', body) => { const r = await fetch(sync.cfg.url.replace(/\/$/, '') + path, { method, headers: { authorization: 'Bearer ' + sync.cfg.token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error('رفض الخادم ' + r.status); return r.json(); };
const ROLE_AR = { admin: 'مدير', meal: 'MEAL', entry: 'مدخل بيانات (المكتب)', coordinator: 'منسق مركز' };
async function vUsers() {
  view().innerHTML = '<div class="card">…</div>'; let us, pol;
  try { us = (await capi('/api/users')).users; pol = (await capi('/api/policy')).policy; } catch (e) { view().innerHTML = `<div class="card">تعذّر التحميل: ${esc(e.message)}</div>`; return; }
  const routesAll = Object.entries(ROUTES).filter(([k]) => k !== 'users');
  view().innerHTML = `<div class="card"><h2>المستخدمون</h2><table><tr><th>المستخدم</th><th>الدور</th><th>المراكز</th><th>الحالة</th><th></th></tr>${us.map((u) => `<tr><td>${esc(u.name)}</td><td>${ROLE_AR[u.role] || u.role}</td><td>${u.centers.map((id) => esc(db.centers.find((c) => c.id === id)?.name || id)).join('، ')}</td><td>${u.active ? '<span class="badge b-ok">فعّال</span>' : '<span class="badge b-error">معطّل</span>'}</td><td>${u.name === me()?.name ? '' : `<button class="sec" data-act="uToggle" data-n="${esc(u.name)}" data-a="${u.active ? 0 : 1}">${u.active ? 'تعطيل' : 'تفعيل'}</button>`}</td></tr>`).join('')}</table>
  <h3>إضافة مستخدم</h3><div class="row"><label>الاسم<input id="un"></label><label>الدور<select id="ur">${Object.entries(ROLE_AR).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
  <label>المراكز (للمنسق)<select id="uc" multiple size="3">${db.centers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><button data-act="uAdd">إضافة</button></div><p id="utok"></p></div>
  <div class="card"><h2>صلاحيات الأدوار</h2><p class="small">تُفرض على الخادم. «مراكزه فقط» تعني أن المستخدم يرى ويكتب جلسات وردود مراكزه فقط. الحقول المخفية لا تصل جهازه أصلًا وتبقى محفوظة كما هي عند تعديله للسجل.</p>
  ${['entry', 'coordinator', 'meal'].map((r) => { const p = pol[r]; return `<h3>${ROLE_AR[r]}</h3><div class="row">
    <label>الجلسات<select data-pol="${r}|sessions">${[['all', 'كل المراكز'], ['own', 'مراكزه فقط']].map(([v, t]) => `<option value="${v}" ${p.read.sessions === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>الشاشات<span class="row">${routesAll.map(([k, [t]]) => `<label style="flex-direction:row;align-items:center;color:inherit"><input type="checkbox" data-polr="${r}|${k}" ${p.routes === '*' || p.routes.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</span></label></div>
    <div class="row"><span class="small">إخفاء من بيانات المستفيد (الجنس والعمر وكون المستفيد من ذوي الإعاقة لا تُخفى لأن الحسابات تعتمد عليها):</span>${['phone', 'disabilityType'].map((f) => `<label style="flex-direction:row;align-items:center;color:inherit"><input type="checkbox" data-polh="${r}|${f}" ${(p.hidden?.beneficiaries || []).includes(f) ? 'checked' : ''}> ${{ phone: 'الهاتف', disabilityType: 'نوع الإعاقة' }[f]}</label>`).join('')}</div>`; }).join('')}
  <div class="row" style="margin-top:12px"><button data-act="polSave">حفظ الصلاحيات</button></div><p id="pmsg"></p></div>`;
  window.__pol = pol;
}
document.addEventListener('change', (e) => {
  const t = e.target, P = window.__pol; if (!P) return;
  if (t.dataset?.pol) { const [r, c] = t.dataset.pol.split('|'); P[r].read[c] = t.value; if (P[r].write[c]) P[r].write[c] = t.value; }
  if (t.dataset?.polr) { const [r, k] = t.dataset.polr.split('|'); const cur = P[r].routes === '*' ? Object.keys(ROUTES).filter((x) => x !== 'users') : P[r].routes; P[r].routes = t.checked ? [...new Set([...cur, k])] : cur.filter((x) => x !== k); }
  if (t.dataset?.polh) { const [r, f] = t.dataset.polh.split('|'); const h = (P[r].hidden ||= {}); const a = new Set(h.beneficiaries || []); t.checked ? a.add(f) : a.delete(f); h.beneficiaries = [...a]; }
});
// ======================= السحابة =======================
let syncing = false, syncMsg = '';
const engine = () => createSync({ db, meta: sync.meta, cfg: sync.cfg });
let fsync = null, fsyncFor = null;
const folderEngine = () => { if (!sync.handle) return null; if (!fsync || fsyncFor !== sync.handle) { fsync = createFolderSync({ db, meta: sync.fmeta, dir: dirFromHandle(sync.handle) }); fsyncFor = sync.handle; } return fsync; };
const isFolder = () => sync.cfg.mode === 'folder';
let fstate = '';   // granted | prompt | none
async function folderPerm(ask) { if (!sync.handle) return (fstate = 'none'); try { let p = await sync.handle.queryPermission({ mode: 'readwrite' }); if (p !== 'granted' && ask) p = await sync.handle.requestPermission({ mode: 'readwrite' }); return (fstate = p); } catch { return (fstate = 'none'); } }
async function doSyncFolder(opts, ask) {
  if (syncing || !sync.handle) return; if ((await folderPerm(ask)) !== 'granted') { syncMsg = 'يلزم تفعيل صلاحية المجلد (اضغط «مزامنة الآن»)'; setSyncBadge(); return; }
  syncing = true; setSyncBadge('⟳ مزامنة…');
  try { const r = await folderEngine().sync(opts); if (!project()) ui.projectId = db.projects[0]?.id || null; save(); syncMsg = `تمت المزامنة: كُتب ${r.wrote} ملف وطُبّق ${r.applied} سجل${r.deleted ? ` وحُذف ${r.deleted}` : ''} (${new Date().toLocaleTimeString('ar')})${r.errors.length ? ' — ⚠ ' + r.errors.join(' | ') : ''}`; if ((r.applied || r.deleted) && ['dash', 'sessions', 'bnf', 'check'].includes(route) && !document.activeElement?.closest('#view input,#view select')) rerender(); }
  catch (e) { syncMsg = 'تعذّرت المزامنة: ' + e.message; }
  syncing = false; setSyncBadge(); if (route === 'cloud') vCloud();
}
async function doSync(opts) {
  if (isFolder()) return doSyncFolder(opts);
  if (syncing || !sync.cfg.url || !sync.cfg.token) return; syncing = true; setSyncBadge('⟳ مزامنة…');
  try { try { sync.cfg.me = await engine().me(); } catch (e) { if (/رمز/.test(e.message)) throw e; } const r = await engine().sync(opts); if (!project()) ui.projectId = db.projects[0]?.id || null; save(); syncMsg = `تمت المزامنة: دُفع ${r.pushed} وسُحب ${r.pulled} (${new Date().toLocaleTimeString('ar')})`; if (r.pulled && ['dash', 'sessions', 'bnf', 'check'].includes(route) && !document.activeElement?.closest('#view input,#view select')) rerender(); }
  catch (e) { syncMsg = 'تعذّرت المزامنة: ' + e.message + ' — البيانات محفوظة محليًا وستُرسل لاحقًا'; }
  syncing = false; nav(); setSyncBadge(); if (route === 'cloud') vCloud();
}
function setSyncBadge(t) { const el = $('#sync'); if (!el) return; const pend = isFolder() ? (folderEngine()?.pending() || 0) : (sync.cfg.url ? engine().pending().length : 0); el.textContent = t || ((isFolder() ? !sync.handle : !sync.cfg.url) ? 'غير مرتبط بالسحابة' : syncMsg.startsWith('تعذّر') ? `⚠ غير متصل — ${pend} تغيير معلّق` : `☁ ${pend ? pend + ' تغيير معلّق' : 'متزامن'}`); }
async function vCloud() {
  const f = isFolder();
  const tabs = `<div class="tabs"><button data-act="setMode" data-m="folder" class="${f ? 'on' : ''}">مجلد OneDrive (موصى به)</button><button data-act="setMode" data-m="server" class="${!f ? 'on' : ''}">خادم مزامنة</button></div>`;
  if (f) {
    const perm = await folderPerm(false); let chs = []; if (perm === 'granted') { try { chs = await dirFromHandle(sync.handle).channels(); } catch {} }
    view().innerHTML = `${tabs}<div class="card"><h2>المزامنة عبر مجلد OneDrive</h2>
    ${!folderSupported() ? '<p><span class="badge b-error">غير مدعوم</span> افتح النظام في Microsoft Edge أو Google Chrome على الحاسوب.</p>' : ''}
    <p class="small">يتولى برنامج OneDrive نقل الملفات بين الأجهزة، والنظام يدمجها دون تعارض ويعمل دون إنترنت. اختر المجلد المتزامن مرة واحدة على كل جهاز.</p>
    <div class="row"><button data-act="pickFolder" ${folderSupported() ? '' : 'disabled'}>اختيار مجلد المزامنة</button><button class="gold" data-act="cloudSync" ${sync.handle ? '' : 'disabled'}>مزامنة الآن</button>
    <label style="flex-direction:row;align-items:center"><input type="checkbox" id="ca" data-act="autoTog" ${sync.cfg.auto ? 'checked' : ''}> مزامنة تلقائية</label></div>
    <p>${sync.handle ? `المجلد: <b>${esc(sync.handle.name)}</b> — الصلاحية: ${perm === 'granted' ? '<span class="badge b-ok">مفعّلة</span>' : '<span class="badge b-warn">تحتاج تفعيلًا (اضغط مزامنة الآن)</span>'}` : '<span class="badge b-warn">لم يُختَر مجلد</span>'}</p>
    <p>القنوات المتزامنة إلى هذا الجهاز: ${chs.length ? chs.map((c) => `<span class="badge b-info">${esc(c === 'core' ? 'core (البيانات الأساسية)' : c === 'pii' ? 'pii (حقول حساسة)' : c.startsWith('c-') ? 'مركز: ' + (db.centers.find((x) => x.id === c.slice(2))?.name || c.slice(2)) : c)}</span>`).join(' ') : '—'}</p>
    <p id="cmsg">${esc(syncMsg)}</p><p class="small">آخر مزامنة: ${sync.fmeta.lastSync ? new Date(sync.fmeta.lastSync).toLocaleString('ar') : '—'} · تغييرات معلّقة: ${folderEngine()?.pending() ?? 0} · معرّف الجهاز: ${esc(sync.fmeta.deviceId)}</p></div>
    <div class="card"><h2>إعداد المجلدات والصلاحيات (مرة واحدة، من حساب OneDrive للمؤسسة)</h2>
    <ol class="small"><li>أنشئ مجلدًا باسم <code>NawaSync</code> وداخله مجلدات: <code>core</code> و<code>pii</code> و<code>c-&lt;رمز المركز&gt;</code> لكل مركز (الرمز يظهر أعلاه بعد أول مزامنة، أو اتركه ينشئها النظام على جهازك ثم شاركها).</li>
    <li><b>core</b>: شاركه (تحرير) مع كل من يستخدم النظام. <b>pii</b> (الهواتف ونوع الإعاقة): مع المكتب الرئيسي وMEAL فقط. <b>c-المركز</b>: مع منسق ذلك المركز ومع المكتب الرئيسي فقط.</li>
    <li>على جهاز المنسق: أضف المجلدات المشاركة إلى OneDrive («إضافة اختصار إلى ملفاتي»)، ثم اختر مجلد <code>NawaSync</code> الذي يحويها.</li>
    <li>الصلاحيات تُفرض بمشاركة OneDrive نفسها: الجهاز لا يستلم إلا المجلدات المشاركة معه.</li></ol></div>`;
    return;
  }
  view().innerHTML = `${tabs}<div class="card"><h2>الاتصال بخادم مزامنة</h2><p class="small">خيار متقدّم يتطلب تشغيل خادم (انظر README).</p>
  <div class="row"><label>عنوان الخادم<input id="cu" style="width:300px" placeholder="https://sync.example.org" value="${esc(sync.cfg.url)}"></label>
  <label>رمز الدخول<input id="ct" type="password" style="width:300px" value="${esc(sync.cfg.token)}"></label>
  <label style="flex-direction:row;align-items:center"><input type="checkbox" id="ca" ${sync.cfg.auto ? 'checked' : ''}> مزامنة تلقائية</label></div>
  <div class="row" style="margin-top:10px"><button data-act="cloudSave">حفظ واختبار الاتصال</button><button class="gold" data-act="cloudSync">مزامنة الآن</button></div>
  <p id="cmsg">${esc(syncMsg)}</p><p class="small">آخر مزامنة: ${sync.meta.lastSync ? new Date(sync.meta.lastSync).toLocaleString('ar') : '—'} · تغييرات معلّقة: ${sync.cfg.url ? engine().pending().length : 0}</p></div>`;
}
// ======================= الإجراءات =======================
const actions = {
  async uAdd() { const name = $('#un').value.trim(); if (!name) return toast('الاسم مطلوب'); const r = await capi('/api/users', 'POST', { name, role: $('#ur').value, centers: [...$('#uc').selectedOptions].map((o) => o.value) }); $('#utok').innerHTML = `<span class="badge b-ok">تم</span> رمز دخول <b>${esc(name)}</b> (يظهر مرة واحدة، سلّمه له بشكل آمن): <code>${esc(r.token)}</code>`; },
  async uToggle(t) { await capi('/api/users/disable', 'POST', { name: t.dataset.n, active: t.dataset.a === '1' }); vUsers(); },
  async polSave() { await capi('/api/policy', 'PUT', { policy: window.__pol }); $('#pmsg').innerHTML = '<span class="badge b-ok">حُفظت</span>'; },
  addOutc() { const p = project(); (p.outcomeIndicators ||= []).push({ id: uid('x'), row: 7, name: 'مؤشر نتيجة جديد', formId: TEMPLATES[0].id, kind: 'threshold', valuePct: 70, round: 'endline' }); save(); rerender(); },
  delOutc(t) { project().outcomeIndicators.splice(+t.dataset.i, 1); save(); rerender(); },
  async dlForm(t) { const tpl = allForms(project()).find((x) => x.id === t.dataset.id); dl(await xlsformBuffer(buildForm(tpl, { projectId: ui.projectId, centers: db.centers })), `${tpl.id}.xlsx`, XL); },
  async impResp() {
    const f = $('#sfile').files[0]; if (!f) return toast('اختر ملف KoBo'); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.worksheets[0];
    const head = ws.getRow(1).values.map((v) => String(v?.result ?? v ?? '')); const rows = []; ws.eachRow((r, i) => { if (i === 1) return; const o = {}; head.forEach((h, c) => { if (h) { const v = r.getCell(c).value; o[h] = v?.result ?? v?.text ?? v; } }); rows.push(o); });
    const r = importResponses(db, rows, $('#sf').value); save(); $('#smsg').innerHTML = `<span class="badge b-ok">أُضيف ${r.added}</span> مكرر ${r.dup} · بلا رمز مستفيد ${r.noId}`; setTimeout(vSurveys, 1500);
  },
  async cloudSave() {
    sync.cfg.url = $('#cu').value.trim(); sync.cfg.token = $('#ct').value.trim(); sync.cfg.auto = $('#ca').checked; save();
    try { const me = await engine().me(); sync.cfg.me = me; syncMsg = `متصل كـ «${me.name}» (${me.role})`; const first = sync.meta.cursor == null && (me.seq > 0) && db.projects.length; if (first) { const rep = confirm('الخادم يحوي بيانات وهذا الجهاز يحوي بيانات أيضًا.\nموافق = استبدال بيانات هذا الجهاز بنسخة الخادم\nإلغاء = دمج الاثنين'); await doSync({ firstMode: rep ? 'replace' : 'merge' }); } else await doSync(); }
    catch (e) { syncMsg = 'فشل الاتصال: ' + e.message; } vCloud(); setSyncBadge();
  },
  async cloudSync() { if (isFolder()) await doSyncFolder({}, true); else await doSync(); vCloud(); },
  setMode(t) { sync.cfg.mode = t.dataset.m; save(); nav(); setSyncBadge(); vCloud(); },
  autoTog(t) { sync.cfg.auto = t.checked; save(); },
  async pickFolder() {
    const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'nawasync' }); sync.handle = h; fsync = null; await saveHandle(h);
    const first = !sync.fmeta.lastSync && db.projects.length; let mode = 'merge';
    if (first) { const chs = await dirFromHandle(h).channels(); const has = chs.length && (await Promise.all(chs.map(async (c) => (await dirFromHandle(h).list(c)).length))).some((n) => n > 0); if (has) mode = confirm('المجلد يحوي بيانات وهذا الجهاز يحوي بيانات أيضًا.\nموافق = استبدال بيانات هذا الجهاز بما في المجلد\nإلغاء = دمج الاثنين') ? 'replace' : 'merge'; }
    await doSyncFolder({ firstMode: mode }, true); vCloud();
  },
  newProject() { const p = { id: uid('p'), name: 'مشروع جديد', donor: '', start: iso(new Date()).slice(0, 4) + '-01-01', end: iso(new Date()).slice(0, 4) + '-12-31', directRule: { mode: 'once' }, interventions: [], activities: [], outputIndicators: [] }; db.projects.push(p); ui.projectId = p.id; save(); go('projects'); },
  demo() { if (db.projects.some((x) => x.id === 'p_fr')) { toast('المشروع التجريبي محمّل مسبقًا'); ui.projectId = 'p_fr'; save(); return go('dash'); } const d = france(); for (const k of Object.keys(d)) db[k].push(...d[k]); ui.projectId = 'p_fr'; save(); toast('تم تحميل المشروع التجريبي (بيانات محاكاة)'); go('dash'); },
  purgeDemo() { if (!confirm('سيُحذف المشروع التجريبي وكل بياناته (جلسات، مستفيدون، مراكز، ردود استبيان) نهائيًا. بياناتك الحقيقية لا تتأثر. متابعة؟')) return; const r = purgeDemo(db); ui.projectId = db.projects[0]?.id || null; save(); toast(`تم مسح المحاكاة: ${r.sessions} جلسة، ${r.beneficiaries} مستفيد`); go('projects'); },
  delProject() { if (!confirm('حذف المشروع وكل جلساته؟')) return; const id = ui.projectId; db.projects = db.projects.filter((p) => p.id !== id); db.sessions = db.sessions.filter((s) => s.projectId !== id); ui.projectId = db.projects[0]?.id; save(); rerender(); },
  addIv() { project().interventions.push({ id: uid('i'), result: 'R1', name: 'بند جديد', group: 'child' }); save(); rerender(); },
  delIv(t) { const p = project(), i = p.interventions[+t.dataset.i]; if (p.activities.some((a) => a.interventionId === i.id)) return toast('البند مرتبط بأنشطة'); p.interventions.splice(+t.dataset.i, 1); save(); rerender(); },
  addAct() { const p = project(); p.activities.push({ id: uid('a'), name: 'نشاط جديد', type: '', interventionId: p.interventions[0].id, group: p.interventions[0].group, ageMin: 4, ageMax: 15, plannedSessions: 0 }); save(); rerender(); },
  delAct(t) { const p = project(), a = p.activities[+t.dataset.i]; if (db.sessions.some((s) => s.activityId === a.id)) return toast('للنشاط جلسات مسجّلة'); p.activities.splice(+t.dataset.i, 1); p.outputIndicators.forEach((o) => (o.activityIds = o.activityIds.filter((x) => x !== a.id))); save(); rerender(); },
  addOut() { project().outputIndicators.push({ id: uid('o'), output: 'output 1', name: 'مؤشر جديد', activityIds: [], measure: 'unique' }); save(); rerender(); },
  delOut(t) { project().outputIndicators.splice(+t.dataset.i, 1); save(); rerender(); },
  addCenter() { const v = $('#cn').value.trim(); if (!v) return; db.centers.push({ id: uid('c'), name: v }); save(); rerender(); },
  delCenter(t) { if (db.sessions.some((s) => s.centerId === t.dataset.id)) return toast('للمركز جلسات مسجّلة'); db.centers = db.centers.filter((c) => c.id !== t.dataset.id); save(); rerender(); },
  addBnf() {
    const b = { id: uid('b'), name: $('#bn').value.trim(), sex: $('#bs').value, age: $('#ba').value === '' ? null : +$('#ba').value, dob: $('#bd').value || null, disability: $('#bdis').value === '1', disabilityType: $('#bdt').value.trim(), phone: $('#bp').value.trim() };
    if (b.dob) b.age = null; if (!b.name) return toast('الاسم مطلوب');
    const dup = db.beneficiaries.find((x) => x.name.trim() === b.name && x.sex === b.sex); if (dup && !confirm('يوجد مستفيد بنفس الاسم والجنس. إضافة رغم ذلك؟')) return;
    db.beneficiaries.push(b); save(); rerender();
  },
  quickBnf() { const n = prompt('الاسم الرباعي؟'); if (!n) return; const age = prompt('العمر؟'); const sx = confirm('هل هو ذكر؟ (إلغاء = أنثى)') ? 'M' : 'F'; const b = { id: uid('b'), name: n.trim(), sex: sx, age: +age || null, disability: confirm('هل لديه إعاقة؟'), disabilityType: '' }; db.beneficiaries.push(b); sess.att.add(b.id); save(); sess.rd?.(); vSessions(); },
  delBnf(t) { if (db.sessions.some((s) => s.attendance?.includes(t.dataset.id)) && !confirm('للمستفيد حضور مسجّل؛ سيُحذف من الجلسات أيضًا. متابعة؟')) return; db.sessions.forEach((s) => s.attendance && (s.attendance = s.attendance.filter((x) => x !== t.dataset.id))); db.beneficiaries = db.beneficiaries.filter((b) => b.id !== t.dataset.id); save(); rerender(); },
  async impBnf() {
    const f = $('#bimp').files[0]; if (!f) return toast('اختر ملفًا'); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.worksheets[0];
    const head = ws.getRow(1).values.map((v) => String(v?.result ?? v ?? '').trim()); const col = (re) => head.findIndex((h) => re.test(h));
    const cN = col(/اسم|name/i), cA = col(/عمر|age/i), cS = col(/جنس|sex|gender/i), cD = col(/إعاقة|اعاقة|disab/i), cP = col(/هاتف|جوال|phone/i); if (cN < 1) return toast('لم أجد عمود الاسم');
    let n = 0, skipped = 0; ws.eachRow((r, i) => { if (i === 1) return; const g = (c) => (c > 0 ? String(r.getCell(c).value?.result ?? r.getCell(c).value ?? '').trim() : ''); const name = g(cN); if (!name) return;
      const sx = /^(أنثى|انثى|f|female|ذكر)$/i.test(g(cS)) ? (/^ذكر$/.test(g(cS)) ? 'M' : 'F') : /^(m|male)$/i.test(g(cS)) ? 'M' : null; if (!sx) { skipped++; return; }
      let ph = g(cP).replace(/\D/g, ''); if (ph.length === 9) ph = '0' + ph;
      db.beneficiaries.push({ id: uid('b'), name, sex: sx, age: +g(cA) || null, disability: /نعم|yes|1|true/i.test(g(cD)), disabilityType: '', phone: ph }); n++; });
    save(); toast(`تم استيراد ${n}${skipped ? ` وتخطي ${skipped} بلا جنس واضح` : ''}`); rerender();
  },
  mode(t) { sess.rd?.(); sess.mode = t.dataset.m; vSessions(); },
  toggleBands(t) { sess.rd?.(); sess.bands = t.checked; vSessions(); },
  saveSession() {
    sess.rd(); const p = project(); const s = { id: uid('s'), projectId: p.id, activityId: sess.act, centerId: sess.center || myCenters()[0]?.id, date: sess.date, educator: (sess.educator || '').trim(), ...(sess.grp?.trim() ? { grp: sess.grp.trim() } : {}), mode: sess.mode, units: sess.units || 1, notes: sess.notes || '' };
    if (s.mode === 'roll') s.attendance = [...sess.att]; else { s.counts = sess.counts; if (sess.bands) s.bandCounts = sess.bandCounts; }
    const v = validateEntry({ ...db, sessions: [s] }).filter((i) => i.ref === s.id || i.ref === s.activityId || i.ref === sess.act);
    const errs = v.filter((i) => i.level === 'error');
    if (errs.length) { $('#sres').innerHTML = errs.map((i) => `<span class="badge b-error">${esc(i.msg)}</span>`).join(' '); return; }
    const warn = v.filter((i) => i.level === 'warn' && !i.code.startsWith('B'));
    if (warn.length && !confirm('تحذيرات:\n' + warn.map((i) => '• ' + i.msg).join('\n') + '\nحفظ رغم ذلك؟')) return;
    db.sessions.push(s); sess.att = new Set(); sess.counts = null; sess.bandCounts = null; save(); toast('تم حفظ الجلسة'); vSessions();
  },
  delSess(t) { if (!confirm('حذف الجلسة؟')) return; db.sessions = db.sessions.filter((s) => s.id !== t.dataset.id); save(); rerender(); },
  async xPTT() {
    const p = project(), tpl = await (await fetch(pttTemplate)).arrayBuffer(); const { data, warnings } = await exportPTT(tpl, p, db, DOMParser, XMLSerializer);
    dl(data, `PTT_${p.name}.xlsx`, XL); $('#xw').innerHTML = warnings.length ? `<h3>ملاحظات على الملف المصدَّر</h3>${warnings.map((w) => `<p><span class="badge b-warn">!</span> ${esc(w)}</p>`).join('')}` : '<span class="badge b-ok">لا ملاحظات</span>';
  },
  async xSTT() { dl(await exportSTT(db, ui.projectId), `STT_${project().name}.xlsx`, XL); },
  async xBTT() { dl(await exportBTT(db, ui.projectId), `BTT_${project().name}.xlsx`, XL); },
  async xSum() { dl(await exportSummary(db, project()), `ملخص_${project().name}.xlsx`, XL); },
  backup() { dl(backupJSON(), `nawa-backup-${iso(new Date())}.json`, 'application/json'); },
  async restore() { const f = $('#rf').files[0]; if (!f) return toast('اختر ملفًا'); if (!confirm('سيُستبدل كل ما في النظام بالنسخة. متابعة؟')) return; restoreJSON(await f.text()); toast('تم الاسترجاع'); go('dash'); },
};

$('.logo').src = logoUrl; { const l = document.createElement('link'); l.rel = 'icon'; l.href = logoUrl; document.head.append(l); }
initPlan({ project, save, rerender, view, empty }); initBuilder({ project, save, rerender }); await load(); nav(); go('dash'); if (isFolder()) { await folderPerm(false); if (fstate === 'granted' && sync.cfg.auto) doSyncFolder({}); } setSyncBadge();
setInterval(() => { if (sync.cfg.auto) doSync(); else setSyncBadge(); }, 60000);
window.addEventListener('online', () => sync.cfg.auto && doSync());
let st; document.addEventListener('change', () => { clearTimeout(st); st = setTimeout(() => sync.cfg.auto && doSync(), 4000); });
if ('serviceWorker' in navigator && location.protocol !== 'file:' && import.meta.env?.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {});
window.__nawa = { db, ui, go, sync, useHandle: async (h) => { sync.handle = h; fsync = null; await saveHandle(h); } };
