// اسم النظام وهويته اللفظية (عربي/إنجليزي)
import { getLang } from './i18n.js';
export const BRAND = {
  ar: { name: 'نَسيج', sub: 'نظام نوى للمتابعة والتقييم وتتبّع المشاريع', title: 'نَسيج | نظام نوى للمتابعة والتقييم وتتبّع المشاريع' },
  en: { name: 'Naseej', sub: 'Nawa MEAL & Programme Tracking System', title: 'Naseej | Nawa MEAL & Programme Tracking System' },
};
export const brand = () => BRAND[getLang() === 'en' ? 'en' : 'ar'];
export const brandHtml = () => { const b = brand(); return `<div class="brandname">${b.name}</div><div class="brandsub">${b.sub}</div>`; };
export function renderBrand() { const e = document.getElementById('brand'); if (e) e.innerHTML = brandHtml(); document.title = brand().title; }

// شاشة افتتاحية (2.5 ث) بلغة الواجهة الحالية — تُستدعى عند تبديل اللغة
let spT;
export function showSplash(ms = 2500) {
  if (navigator.webdriver && !localStorage.getItem('nawa.testSplash')) return;
  const old = document.getElementById('splash'); if (old) old.remove(); clearTimeout(spT);
  const en = getLang() === 'en', b = brand(), d = document.createElement('div');
  d.id = 'splash'; d.setAttribute('aria-hidden', 'true'); d.dir = en ? 'ltr' : 'rtl';
  d.innerHTML = `<div class="sp-in"><img id="sp-logo" alt="" src="${document.querySelector('.logo')?.src || ''}"><div class="sp-name">${b.name}</div><div class="sp-sub">${b.sub}</div><div class="sp-line"></div></div>`;
  const done = () => { clearTimeout(spT); d.classList.add('out'); setTimeout(() => d.remove(), 600); };
  d.addEventListener('click', done); document.body.appendChild(d); spT = setTimeout(done, ms);
}
