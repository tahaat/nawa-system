import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../core/settings.js';
import { nameState, phoneState, normPhone, idState, emailState, urlOk, toLatin } from '../core/bnf.js';

test('الاسم: منقوص حتى يكتمل الرباعي ثم صحيح، والعدد قابل للضبط', () => {
  loadConfig({}); assert.equal(nameState('').s, 'empty'); assert.equal(nameState('محمد أحمد').s, 'bad'); assert.match(nameState('محمد أحمد علي').msg, /3 من 4/);
  assert.equal(nameState('محمد أحمد علي سالم').s, 'ok'); loadConfig({ vars: { bnfNameWords: 3 } }); assert.equal(nameState('محمد أحمد علي').s, 'ok'); loadConfig({});
});
test('الهاتف: 10 أرقام تبدأ 059/056 مع تطبيع الأرقام العربية والرمز الدولي', () => {
  assert.equal(phoneState('0595123456').s, 'ok'); assert.equal(phoneState('0565123456').s, 'ok'); assert.equal(phoneState('0585123456').s, 'bad'); assert.equal(phoneState('059512345').s, 'bad'); assert.equal(phoneState('05953370145').s, 'bad');
  assert.equal(normPhone('٠٥٩٥ ١٢٣-٤٥٦'), '0595123456'); assert.equal(normPhone('+970595123456'), '0595123456'); assert.equal(normPhone('595123456'), '0595123456'); assert.equal(phoneState('').s, 'empty');
});
test('الهوية والبريد والرابط', () => {
  assert.equal(idState('123').s, 'bad'); assert.equal(idState('').s, 'empty'); assert.equal(idState('000000018').s, 'ok'); assert.equal(idState('123456789').s, 'warn');
  assert.equal(emailState('example@gmail.com').s, 'ok'); assert.equal(emailState('abc@').s, 'bad'); assert.equal(urlOk('https://drive.google.com/x'), true); assert.equal(urlOk('javascript:alert(1)'), false); assert.equal(toLatin('٣٤'), '34');
});
