import test from 'node:test'; import assert from 'node:assert/strict';
import { DEV_ROLES, PIN_ROLES, roleMe, makeVerifier, checkPin, fpOf, needsPin } from '../core/roles.js';
test('الرمز: صحيح يُقبل وخاطئ يُرفض ولا يُخزَّن نصًا', async () => {
  const v = await makeVerifier('Abc-1234'); assert.ok(await checkPin('Abc-1234', v)); assert.ok(await checkPin(' Abc-1234 ', v)); assert.ok(!(await checkPin('abc-1234', v)));
  assert.ok(!JSON.stringify(v).includes('Abc')); const v2 = await makeVerifier('Abc-1234'); assert.notEqual(v.hash, v2.hash); assert.notEqual(fpOf(v), fpOf(v2));
  await assert.rejects(() => makeVerifier('12345'));
  assert.ok(!(await checkPin('x', null)));
});
test('الأدوار العليا هي مشاريع/متابعة/مدير فقط، وكل منها برمز مستقل', async () => {
  assert.deepEqual(PIN_ROLES.sort(), ['admin', 'meal', 'projects']); assert.ok(!needsPin('entry') && !needsPin('facilitator') && !needsPin('coordinator'));
  const a = await makeVerifier('Same-pin-1'), b = await makeVerifier('Same-pin-1'); assert.notEqual(a.salt, b.salt);
});
test('سياسة الدور: المدخل بلا إعدادات/فريق والمنشط شاشات قليلة والمنسق مركز واحد', () => {
  const e = roleMe('entry'); assert.ok(!e.policy.routes.includes('settings') && !e.policy.routes.includes('projects') && e.policy.routes.includes('bnf'));
  const f = roleMe('facilitator', 'c1'); assert.deepEqual(f.centers, ['c1']); assert.equal(f.policy.write.sessions, 'own'); assert.ok(!f.policy.routes.includes('dash'));
  assert.equal(roleMe('admin').policy.routes, '*'); assert.equal(roleMe('meal').policy.manageUsers, false); assert.equal(roleMe('nope'), null);
  for (const k of Object.keys(DEV_ROLES)) assert.ok(roleMe(k, 'c1'));
});
