# نشر «نَسيج» على Cloudflare (للموبايل والآيباد)

الفكرة: Worker واحد يخدم الواجهة وقاعدة البيانات (D1)، وتحميه بوابة **Cloudflare Access**؛ فيدخل الموظف ببريده ويرى ما تسمح به صلاحياته فقط.
نسخة الكمبيوتر (مزامنة OneDrive) تبقى كما هي على GitHub Pages.

## 1) الحساب والأدوات
1. أنشئ حساب Cloudflare مجانياً (من موقعهم، بنفسك).
2. على جهازك (يلزم Node 20+):
   ```
   git clone https://github.com/tahaat/nawa-system && cd nawa-system
   npm install
   npx wrangler login
   ```

## 2) قاعدة البيانات
```
npx wrangler d1 create naseej
```
انسخ `database_id` الظاهر وضعه في `wrangler.toml` مكان «ضع-معرّف-القاعدة-هنا»، ثم:
```
npx wrangler d1 execute naseej --remote --file=worker/schema.sql
```

## 3) بوابة Access (Zero Trust)
1. لوحة Cloudflare ▸ **Zero Trust** ▸ اختر اسم الفريق (يصبح `اسمك.cloudflareaccess.com`) ▸ الخطة المجانية.
2. **Settings ▸ Authentication ▸ Login methods**: أضف **One-time PIN** (رمز يصل للبريد) — أو **Microsoft Entra ID** لاحقاً لربط مجموعات M365.
3. بعد نشر الـ Worker (الخطوة 4): **Access ▸ Applications ▸ Add ▸ Self-hosted** على نطاق الـ Worker (`naseej.<حسابك>.workers.dev`)، وأضف سياسة Allow لبريد كل موظف (أو نطاق `@nawaculture.org`).
4. من صفحة التطبيق انسخ **Application Audience (AUD) Tag**.

## 4) النشر
```
npm run build
npx wrangler deploy
```
ثم من لوحة Cloudflare ▸ Workers ▸ naseej ▸ **Settings ▸ Variables** أضف:

| المتغير | القيمة |
|---|---|
| `TEAM_DOMAIN` | `اسمك.cloudflareaccess.com` |
| `POLICY_AUD` | الـ AUD Tag من الخطوة 3 |
| `ADMIN_EMAIL` | بريد مدير النظام (يُنشأ تلقائياً بدور مدير عند أول دخول) |

> لا تضع `DEV_EMAIL` في الإنتاج أبداً؛ هو للتطوير المحلي فقط (`.dev.vars`).

## 5) الاستخدام
- افتح رابط الـ Worker ◂ أدخل بريدك ◂ يصلك رمز ◂ تدخل.
- من «المستخدمون» أضف الموظفين **بالبريد** مع الدور والتكليفات (مشروع + مركز + فترة).
- من لم يُضَف يرى رسالة «حسابك غير مُضاف».
- تحديث النظام: `git push` ثم `npm run build && npx wrangler deploy`.

## تجربة محلية
```
printf 'DEV_EMAIL=admin@test.local\nADMIN_EMAIL=admin@test.local\n' > .dev.vars
npx wrangler d1 execute naseej --local --file=worker/schema.sql
npx wrangler dev --local --port 8799
node test/worker_api.mjs        # اختبار الصلاحيات
```
(الترويسة `x-dev-email` تبدّل المستخدم أثناء الاختبار المحلي فقط.)

## حدود الخطة المجانية (تحقق منها في صفحة الأسعار)
- الـ Worker: نحو 100 ألف طلب يومياً، 10ms CPU لكل طلب؛ استعلامات D1 محدودة لكل طلب، لذا تُدفع التغييرات على دفعات من 25 سجلاً وتُسحب على دفعات من 300.
- D1: 5GB تخزين. Access: حتى 50 مستخدماً.
- احتفظ بنسخة احتياطية دورية: `npx wrangler d1 export naseej --remote --output=backup.sql`.
