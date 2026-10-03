const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../src/features/workschedule/shared/utils/date.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const date = {};
new Function('exports', compiled.outputText)(date);
const policy = {
  registration_start: '2026-10-28T17:00:00.000Z',
  registration_end: '2026-10-31T16:59:59.999Z',
  schedule_month: '2026-10',
  locked: false,
};

test('calendar days use Vietnam midnight and preserve date-only values', () => {
  assert.equal(date.getScheduleDateKey('2026-10-31T16:59:59.999Z'), '2026-10-31');
  assert.equal(date.getScheduleDateKey('2026-10-31T17:00:00.000Z'), '2026-11-01');
  assert.equal(date.getScheduleDateKey('2026-10-31'), '2026-10-31');
  assert.equal(date.toLocalDateKey(date.getScheduleToday(new Date('2026-10-31T17:00:00Z'))), '2026-11-01');
});

test('registration accepts one month and rejects October 29 to November 2', () => {
  assert.equal(date.getRegistrationMonth(policy), '2026-10');
  assert.equal(date.getRegistrationMonth({ ...policy, registration_end: '2026-11-02T10:00:00Z' }), null);
  assert.equal(date.getRegistrationMonth({ ...policy, schedule_month: '2026-11' }), null);
});

test('registration fails closed without a valid policy or outside the opening window', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  assert.equal(date.isRegistrationClosed(null, now), true);
  assert.equal(date.isRegistrationClosed({ ...policy, locked: true }, now), true);
  assert.equal(date.isRegistrationClosed({ ...policy, registration_start: 'bad-date' }, now), true);
  assert.equal(date.isRegistrationClosed({ ...policy, registration_start: policy.registration_end }, now), true);
  assert.equal(date.isRegistrationClosed(policy, new Date('2026-10-28T16:59:59Z')), true);
  assert.equal(date.isRegistrationClosed(policy, new Date('2026-10-31T17:00:00Z')), true);
  assert.equal(date.isRegistrationClosed(policy, now), false);
});

test('month conversion remains stable across year boundaries and leap years', () => {
  assert.equal(date.toMonthKey(date.monthDate('2027-01')), '2027-01');
  const february = date.monthDate('2028-02');
  assert.equal(new Date(february.getFullYear(), february.getMonth() + 1, 0).getDate(), 29);
});
