import test from 'node:test'; import assert from 'node:assert/strict';
import { DEV_ROLES, PIN_ROLES, roleMe, makeVerifier, checkPin, fpOf, needsPin, pinProblem, normPin } from '../core/roles.js';
test('الرمز: صحيح يُقبل وخاطئ يُرفض ولا يُخزَّن نصًا', async () => {
  const v = await makeVerifier('482915'); assert.ok(await checkPin('482915', v)); assert.ok(await checkPin(' 482915 ', v)); assert.ok(!(await checkPin('482916', v)));
  assert.ok(!JSON.stringify(v).includes('482915')); const v2 = await makeVerifier('482915'); assert.notEqual(v.hash, v2.hash); assert.notEqual(fpOf(v), fpOf(v2));
  await assert.rejects(() => makeVerifier('123')); await assert.rejects(() => makeVerifier('12ab')); assert.ok(await makeVerifier('1234')); assert.ok(await makeVerifier('1234567890123456'));   // 4 أرقام فأكثر بلا حد أعلى
  assert.ok(!(await checkPin('x', null)));
});
test('الأدوار المقفلة: مشاريع/متابعة/مدير/مدخل بيانات، وكل منها برمز مستقل', async () => {
  assert.deepEqual(PIN_ROLES.sort(), ['admin', 'entry', 'meal', 'projects']); assert.ok(needsPin('entry') && !needsPin('facilitator') && !needsPin('coordinator'));
  const a = await makeVerifier('135790'), b = await makeVerifier('135790'); assert.notEqual(a.salt, b.salt);
});
test('سياسة الدور: المدخل بلا إعدادات/فريق والمنشط شاشات قليلة والمنسق مركز واحد', () => {
  const e = roleMe('entry'); assert.ok(!e.policy.routes.includes('settings') && !e.policy.routes.includes('projects') && e.policy.routes.includes('bnf'));
  const f = roleMe('facilitator', 'c1'); assert.deepEqual(f.centers, ['c1']); assert.equal(f.policy.write.sessions, 'own'); assert.ok(!f.policy.routes.includes('dash'));
  assert.equal(roleMe('admin').policy.routes, '*'); assert.equal(roleMe('meal').policy.manageUsers, false); assert.equal(roleMe('nope'), null);
  for (const k of Object.keys(DEV_ROLES)) assert.ok(roleMe(k, 'c1'));
});

test('الأرقام العربية تُقبل كاللاتينية', async () => {
  assert.equal(normPin('٢٥٨٠'), '2580'); assert.equal(normPin('۲۵۸۰'), '2580'); assert.equal(pinProblem('٢٥٨٠'), ''); assert.ok(pinProblem('25'));
  const v = await makeVerifier('2580'); assert.ok(await checkPin('٢٥٨٠', v)); assert.ok(await checkPin('2580', v));
});
