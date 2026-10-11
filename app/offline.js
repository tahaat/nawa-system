// العمل بلا إنترنت: تسجيل ملف الخدمة (يخزّن البرنامج بعد أول فتح) + زر التثبيت كتطبيق
let evt = null, ready = false;
const ok = () => 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && typeof window.claude?.use !== 'function';
export function initOffline() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evt = e; document.querySelector('#pwa')?.removeAttribute('hidden'); });
  addEventListener('appinstalled', () => { evt = null; document.querySelector('#pwa')?.setAttribute('hidden', ''); });
  if (!ok()) return;
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => { ready = true; const s = document.querySelector('#pwast'); if (s) s.innerHTML = status(); }).catch((e) => console.warn('sw', e));
}
const status = () => ok() ? (ready || navigator.serviceWorker.controller ? '<span class="badge b-ok">جاهز للعمل بلا إنترنت</span>' : '<span class="badge b-warn">جارٍ التخزين… أعد فتح الصفحة بعد لحظات</span>') : '<span class="badge b-info">يعمل بلا إنترنت بفتح ملف index.html المحفوظ على الجهاز</span>';
export const offlineCard = () => `<div class="card"><h2>العمل بلا إنترنت</h2><p class="small">بعد أول فتح بالإنترنت يُخزَّن البرنامج في المتصفح ويُفتح لاحقًا من الرابط نفسه دون اتصال، وبياناتك تبقى على جهازك. الترجمة عبر الإنترنت والمزامنة السحابية فقط تحتاجان اتصالًا. خذ نسخة احتياطية دورية.</p>
  <div class="row"><span id="pwast">${status()}</span><button id="pwa" data-act="pwaInstall" ${evt ? '' : 'hidden'}>تثبيت كتطبيق</button></div>
  <p class="small">إن لم يظهر زر التثبيت: في Chrome/Edge افتح قائمة المتصفح ← «تثبيت التطبيق»، وفي الهاتف «إضافة إلى الشاشة الرئيسية» (في iPhone: مشاركة ← إضافة إلى الشاشة الرئيسية).</p></div>`;
export const offlineActions = { async pwaInstall() { if (!evt) return; evt.prompt(); await evt.userChoice; evt = null; document.querySelector('#pwa')?.setAttribute('hidden', ''); } };
