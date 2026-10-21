import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maintenanceState, formatTime } from '../public/js/maintenance-time.js';

test('maintenance follows Berlin time and changes at the original warning/start/end times', () => {
  const at = time => maintenanceState(new Date(`2026-10-22T${time}:00Z`));
  assert.deepEqual(at('03:59'), { state: 'normal', ms: 31 * 60000 });
  assert.deepEqual(at('04:00'), { state: 'warning', ms: 30 * 60000 });
  assert.deepEqual(at('04:30'), { state: 'active', ms: 30 * 60000 });
  assert.deepEqual(at('05:00'), { state: 'normal', ms: (23 * 60 + 30) * 60000 });
  assert.equal(maintenanceState(new Date('2026-12-01T05:30:00Z')).state, 'active');
});
test('maintenance countdown preserves long and short display formats', () => {
  assert.equal(formatTime(3661000), '1h 01m 01s');
  assert.equal(formatTime(3661000, true), '1h 01m');
  assert.equal(formatTime(61000), '01:01');
  assert.equal(formatTime(-1), '00:00');
});
