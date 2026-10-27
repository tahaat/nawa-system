import test from 'node:test'; import assert from 'node:assert/strict';
import { plan, pick, kindOf } from '../core/restore.js';
const R = (coll, id, ts, extra = {}) => ({ coll, id, data: '{}', ts, deleted: 0, project: 'p1', ...extra });
test('الاستعادة الانتقائية: المفقود والمحذوف فقط، والسليم لا يُمسّ', () => {
  const have = new Map([['s|a', { ts: 100, deleted: 0 }], ['s|b', { ts: 90, deleted: 1 }]]);
  const recs = [R('s', 'a', 50), R('s', 'b', 80), R('s', 'c', 70), R('s', 'd', 60, { deleted: 1 })];
  const p = plan(recs, have, { mode: 'missing' });
  assert.deepEqual(p.acts.map((a) => a.r.id + ':' + a.kind), ['b:revive', 'c:missing']); assert.equal(p.counts.s.skip, 1);   // d المحذوف في النسخة لا يُعاد
});
test('وضع newer يحدّث ما نسخته أحدث فقط', () => {
  const have = new Map([['s|a', { ts: 40, deleted: 0 }], ['s|b', { ts: 99, deleted: 0 }]]);
  const p = plan([R('s', 'a', 50), R('s', 'b', 50)], have, { mode: 'newer' }); assert.deepEqual(p.acts.map((a) => a.r.id + ':' + a.kind), ['a:newer']);
  assert.equal(plan([R('s', 'a', 50)], have, { mode: 'missing' }).total, 0);
});
test('التصفية بالمجموعة والمشروع والتاريخ', () => {
  const recs = [R('s', '1', Date.parse('2026-10-05'), { project: 'p1' }), R('b', '2', Date.parse('2026-10-05'), { project: 'p2' }), R('s', '3', Date.parse('2026-09-01'), { project: 'p1' })];
  assert.equal(pick(recs, { colls: ['s'] }).length, 2); assert.equal(pick(recs, { project: 'p2' }).length, 1); assert.equal(pick(recs, { since: '2026-10-01' }).length, 2);
  assert.equal(kindOf(recs[0], undefined, 'missing'), 'missing');
});
