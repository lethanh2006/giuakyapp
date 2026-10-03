import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  upstreamHttpOptions,
} from './upstream-http.module';

test('dùng timeout mặc định và không đi theo redirect', () => {
  assert.deepEqual(upstreamHttpOptions(undefined), {
    timeout: DEFAULT_UPSTREAM_TIMEOUT_MS,
    maxRedirects: 0,
  });
});

test('nhận timeout hợp lệ từ biến môi trường', () => {
  assert.deepEqual(upstreamHttpOptions('15000'), {
    timeout: 15_000,
    maxRedirects: 0,
  });
});

test('từ chối timeout không hợp lệ', () => {
  for (const value of ['abc', '499', '120001', '1000.5']) {
    assert.throws(
      () => upstreamHttpOptions(value),
      /UPSTREAM_TIMEOUT_MS phải là số nguyên trong khoảng 500-120000/,
    );
  }
});
