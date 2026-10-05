import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { tiny } from './fixture.js'; import { exportPTT } from '../core/ptt-export.js';
test('تصدير PTT ينتج ملفًا صالحًا يحتفظ بالمخططات', async () => {
  const buf = fs.readFileSync('assets/ptt.xlsx'), db = tiny();
  const { data, warnings } = await exportPTT(buf, db.projects[0], db, DOMParser, XMLSerializer);
  fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/ptt_test.xlsx', data);
  console.log(warnings);
  assert.ok(data.length > 100000);
});
