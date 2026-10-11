import test from 'node:test';
import assert from 'node:assert/strict';
import { cfg, V, loadConfig, rowsToLists, listsToRows, groupEn, applyConfig } from '../core/settings.js';
import { nameOk } from '../core/sheets.js';
import { GROUPS } from '../core/model.js';

test('المتغيرات تؤثر في التحقق وتعود للافتراضي', () => {
  loadConfig({ vars: {} });
  assert.equal(nameOk('محمد أحمد'), false); assert.equal(V('nameMinWords'), 3);
  loadConfig({ vars: { nameMinWords: 2 } }); assert.equal(nameOk('محمد أحمد'), true);
  loadConfig({ vars: { nameMinWords: '' } }); assert.equal(V('nameMinWords'), 3);
});
test('تسميات الفئات تُطبَّق في مكانها وتُستعاد', () => {
  const orig = GROUPS.youth; loadConfig({ groupAr: { youth: 'فتيان' }, groupEn: { youth: 'Young people' } });
  assert.equal(GROUPS.youth, 'فتيان'); assert.equal(groupEn('youth'), 'Young people');
  loadConfig({}); assert.equal(GROUPS.youth, orig); assert.equal(groupEn('youth'), 'Youth');
});
test('القوائم المخصصة: دمج choices ذهابًا وإيابًا', () => {
  loadConfig({}); const r = rowsToLists([['hood', '1', 'الرمال', 'Rimal'], ['hood', '2', 'النصيرات', ''], ['hood', '1', 'الرمال', 'Al-Rimal'], ['', '3', 'x', 'y']]);
  assert.deepEqual(r, { add: 2, upd: 1 }); assert.deepEqual(listsToRows()[0], ['hood', '1', 'الرمال', 'Al-Rimal']); assert.equal(cfg.lists[0].items.length, 2);
});
