// المسودات: حفظ العمل غير المكتمل (كشوف، جلسات، إنجاز، مستفيد) والعودة إليه لاحقًا.
// تُحفظ في kv محليًا (مفتاح drafts) خارج قاعدة البيانات الرئيسية: لا تدخل التحقق ولا التقارير ولا المزامنة ولا التصدير حتى تُحفظ نهائيًا.
import { kvGet, kvSet } from './store.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const TYPES = { sheet: ['كشف حضور', 'sheets'], session: ['جلسة', 'sessions'], op: ['إنجاز تشغيلي', 'ops'], bnf: ['مستفيد', 'bnf'] };
export const D = { list: [] };
export async function loadDrafts() { const v = await kvGet('drafts'); D.list = Array.isArray(v) ? v : []; }
const persist = () => kvSet('drafts', D.list);
export function putDraft({ id, type, projectId, title, data }) {
  const x = { id, type, projectId, title: title || TYPES[type][0], data, at: new Date().toISOString() }, i = D.list.findIndex((d) => d.id === id);
  if (i >= 0) D.list[i] = x; else D.list.push(x); persist(); window.dispatchEvent(new CustomEvent('nawa:drafts')); return x;
}
export function delDraft(id) { const n = D.list.length; D.list = D.list.filter((d) => d.id !== id); if (D.list.length !== n) { persist(); window.dispatchEvent(new CustomEvent('nawa:drafts')); } }
export const getDraft = (id) => D.list.find((d) => d.id === id);
export const draftsOf = (projectId, type) => D.list.filter((d) => (!projectId || d.projectId === projectId) && (!type || d.type === type)).sort((a, b) => b.at.localeCompare(a.at));
export const draftCount = (projectId) => draftsOf(projectId).length;
export const newDraftId = (type) => `${type}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const when = (iso) => { try { return new Date(iso).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };
export function draftRows(list, showType) {
  return `<table class="dtab"><tr>${showType ? '<th>النوع</th>' : ''}<th>المسودة</th><th>آخر تعديل</th><th></th></tr>${list.map((d) => `<tr>${showType ? `<td>${esc(TYPES[d.type]?.[0] || d.type)}</td>` : ''}<td>${esc(d.title)}</td><td class="small">${esc(when(d.at))}</td><td><button data-act="draftResume" data-id="${esc(d.id)}">متابعة</button> <button class="x" data-act="draftDel" data-id="${esc(d.id)}">حذف</button></td></tr>`).join('')}</table>`;
}
// بطاقة المسودات في أعلى الشاشة (فارغة إن لم توجد مسودات)
export function draftsCard(projectId, type) {
  const l = draftsOf(projectId, type); if (!l.length) return '';
  return `<div class="card dcard" id="draftcard"><h2>المسودات (${l.length})</h2><p class="small">عمل غير مكتمل محفوظ على هذا الجهاز. اضغط «متابعة» لاستئنافه وإكماله ثم حفظه نهائيًا؛ ولا تُحتسب المسودات في التقارير والتحقق حتى تُحفظ.</p>${draftRows(l, false)}</div>`;
}
