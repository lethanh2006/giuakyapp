import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateScheduleRequestDto } from './create-request.dto';
import {
  UpdatePolicyDto,
  UpdateScheduleEntriesDto,
} from './update-entries.dto';

const entries = Array.from({ length: 31 }, (_, day) => ({
  date: `2026-10-${String(day + 1).padStart(2, '0')}`,
  type: 'office',
  period: 'full_day',
}));

test('gateway nhận đầy đủ 31 ngày khi tạo và điều chỉnh lịch tháng', async () => {
  const create = plainToInstance(CreateScheduleRequestDto, {
    month: '2026-10',
    entries,
  });
  const update = plainToInstance(UpdateScheduleEntriesDto, { entries });
  assert.deepEqual(await validate(create), []);
  assert.deepEqual(await validate(update), []);
});

test('gateway từ chối lịch tuần cũ, tháng sai định dạng và quá 31 ngày', async () => {
  for (const payload of [
    { week_start: '2026-10-05', entries },
    { month: '2026-13', entries },
    { month: '2026-10', entries: [...entries, entries[0]] },
  ]) {
    assert.ok(
      (await validate(plainToInstance(CreateScheduleRequestDto, payload)))
        .length > 0,
    );
  }
});

test('gateway chỉ nhận cửa sổ đăng ký để dịch vụ tự xác định tháng', async () => {
  const policy = plainToInstance(UpdatePolicyDto, {
    schedule_month: '2026-10',
    registration_start: '2026-10-01T00:00:00+07:00',
    registration_end: '2026-10-31T23:59:59+07:00',
    locked: false,
  });
  assert.deepEqual(await validate(policy, { whitelist: true }), []);
  assert.equal('schedule_month' in policy, false);
});
