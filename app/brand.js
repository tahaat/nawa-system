// اسم النظام وهويته اللفظية (عربي/إنجليزي)
import { getLang } from './i18n.js';
export const BRAND = {
  ar: { name: 'نَسيج', sub: 'نظام نوى للمتابعة والتقييم وتتبّع المشاريع', title: 'نَسيج | نظام نوى للمتابعة والتقييم وتتبّع المشاريع' },
  en: { name: 'Naseej', sub: 'Nawa MEAL & Projects Tracking System', title: 'Naseej | Nawa MEAL & Projects Tracking System' },
};
export const brand = () => BRAND[getLang() === 'en' ? 'en' : 'ar'];
export const brandHtml = () => { const b = brand(); return `<div class="brandname">${b.name}</div><div class="brandsub">${b.sub}</div>`; };
export function renderBrand() { const e = document.getElementById('brand'); if (e) e.innerHTML = brandHtml(); document.title = brand().title; }
