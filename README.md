# نظام نوى للمشاريع والمستفيدين (v0.1)
- التشغيل: افتح `Nawa_System.html` بالنقر المزدوج (يعمل دون إنترنت؛ البيانات تُحفظ في المتصفح — خذ نسخة احتياطية JSON دوريًا).
- التطوير: `npm i` ثم `npm run dev` | البناء: `npm run build` | الاختبارات: `npm test` و `node test/ptt_lo.mjs` (يتطلب LibreOffice).
- core/: المحرك (aggregate: الحساب، validate: التحقق والتكامل، ptt-export: تعبئة قالب Annex 5 على مستوى XML، xlsx-export: STT/BTT).
- app/: الواجهة (RTL، هوية نوى).
