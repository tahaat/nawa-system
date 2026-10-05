// نوافذ تأكيد/إدخال داخل الصفحة (confirm/prompt المدمجة لا تعمل داخل نسخة الرابط)
function modal(msg, { input = false, ok = 'تأكيد', cancel = 'إلغاء' } = {}) {
  return new Promise((res) => {
    const w = document.createElement('div'); w.className = 'dlg-bg'; w.setAttribute('role', 'dialog');
    w.innerHTML = `<div class="dlg"><p></p>${input ? '<input id="dlg-in" style="width:100%">' : ''}<div class="row"><button id="dlg-ok"></button><button class="sec" id="dlg-no"></button></div></div>`;
    w.querySelector('p').textContent = msg; w.querySelector('#dlg-ok').textContent = ok; w.querySelector('#dlg-no').textContent = cancel;
    const done = (v) => { w.remove(); res(v); };
    w.querySelector('#dlg-ok').onclick = () => done(input ? w.querySelector('#dlg-in').value : true);
    w.querySelector('#dlg-no').onclick = () => done(input ? null : false);
    w.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(input ? null : false); if (e.key === 'Enter' && input) done(w.querySelector('#dlg-in').value); });
    document.body.appendChild(w); (w.querySelector('#dlg-in') || w.querySelector('#dlg-ok')).focus();
  });
}
export const ask = (msg, o) => modal(msg, o);
export const askText = (msg) => modal(msg, { input: true });
