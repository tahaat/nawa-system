import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRAND } from '../core/xlsx-export.js';
test('خط التصدير ثابت Sakkal Majalla ولا تعتمد طبقة التصدير على لغة أو خط الواجهة', () => {
  assert.equal(BRAND.font, 'Sakkal Majalla');
  for (const f of ['xlsx-export', 'ptt-export', 'forms', 'plan']) assert.ok(!/i18n|Tajawal|Cairo/.test(readFileSync(new URL(`../core/${f}.js`, import.meta.url), 'utf8')), f);
});
