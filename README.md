# نظام نوى للمشاريع والمستفيدين (v0.1)
- التشغيل: افتح `Nawa_System.html` بالنقر المزدوج (يعمل دون إنترنت؛ البيانات تُحفظ في المتصفح — خذ نسخة احتياطية JSON دوريًا).
- التطوير: `npm i` ثم `npm run dev` | البناء: `npm run build` | الاختبارات: `npm test` و `node test/ptt_lo.mjs` (يتطلب LibreOffice).
- core/: المحرك (aggregate: الحساب، validate: التحقق والتكامل، ptt-export: تعبئة قالب Annex 5 على مستوى XML، xlsx-export: STT/BTT).
- app/: الواجهة (RTL، هوية نوى).

## السحابة (المزامنة)
- الخادم (Node 22+، بلا اعتمادات): `PORT=8787 NAWA_DB=./nawa-data.sqlite node server/server.js` — يطبع رمز المدير مرة واحدة عند أول تشغيل، ويقدّم التطبيق نفسه على `/`.
- مستخدمون: `node server/cli.js add <اسم> <admin|meal|entry|coordinator> [مراكز]` | `list` | `disable <اسم>`.
- Docker: `npm run build` ثم `docker build -t nawa-sync .` ثم `docker run -p 8787:8787 -v nawa-data:/data nawa-sync`.
- ضعه خلف HTTPS (Caddy/nginx) قبل أي استخدام عبر الإنترنت. النسخ الاحتياطي = نسخ ملف SQLite.
- المزامنة: تعمل دون إنترنت، تدمج على مستوى السجل (الأحدث يفوز)، الحذف بشواهد، التغييرات المعلّقة تُرسل عند عودة الاتصال.
- الاختبار: `node --no-warnings --test test/sync.test.js`.
