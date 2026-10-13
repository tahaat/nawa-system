import test from 'node:test'; import assert from 'node:assert/strict';
import { sharePlan, roleFrom, folderOf } from '../core/share.js';
const cs = [{ id: 'c_a', name: 'مركز زيتونة' }, { id: 'c_b', name: 'منتزهات النوى' }];
test('خطة المشاركة حسب الدور والمركز', () => {
  const f = sharePlan({ role: 'facilitator', center: 'c_a' }, cs); assert.deepEqual(f.map((x) => x.folder + ':' + x.access), ['core:view', 'c-c_a:edit']);
  assert.ok(!f.some((x) => x.folder === 'pii')); // المنشط لا يرى الحقول الحساسة
  assert.equal(sharePlan({ role: 'facilitator' }, cs).at(-1).access, null); // بلا مركز: تنبيه
  const m = sharePlan({ role: 'meal' }, cs); assert.deepEqual(m.map((x) => x.folder), ['core', 'pii', 'c-c_a', 'c-c_b']); assert.ok(m.every((x) => x.access === 'edit'));
  assert.deepEqual(sharePlan({ role: 'projects' }, cs).map((x) => x.access), ['edit', 'view', 'view']);
  assert.deepEqual(sharePlan({ role: 'entry' }, cs).map((x) => x.folder), ['core', 'pii', 'c-c_a', 'c-c_b']);
  assert.equal(folderOf(cs[0]), 'c-c_a');
});
test('مطابقة الدور من النص العربي', () => {
  assert.equal(roleFrom('منشط / تربوي'), 'facilitator'); assert.equal(roleFrom('منسق مركز'), 'coordinator'); assert.equal(roleFrom('مسؤول مشاريع'), 'projects');
  assert.equal(roleFrom('منسق المتابعة والتقييم'), 'meal'); assert.equal(roleFrom('مدخل بيانات'), 'entry'); assert.equal(roleFrom('مدير النظام'), 'admin'); assert.equal(roleFrom('سائق'), '');
});
