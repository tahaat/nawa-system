import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import ExcelJS from 'exceljs';
import { big } from './fixture.js'; import { exportSTT, exportBTT } from '../core/xlsx-export.js'; import { sttRows } from '../core/aggregate.js';
test('STT/BTT Excel يطابق الحساب', async () => {
  const db = big(); fs.mkdirSync('out', { recursive: true });
  const s = await exportSTT(db); fs.writeFileSync('out/stt_test.xlsx', Buffer.from(s));
  const b = await exportBTT(db); fs.writeFileSync('out/btt_test.xlsx', Buffer.from(b));
  const w = new ExcelJS.Workbook(); await w.xlsx.load(s); const ws = w.worksheets[0];
  assert.equal(ws.rowCount - 1, 160); let sum = 0; ws.eachRow((r, i) => { if (i > 1) sum += r.getCell(17).result ?? r.getCell(17).value.result; });
  assert.equal(sum, sttRows(db).reduce((a, r) => a + r.total, 0));
});
