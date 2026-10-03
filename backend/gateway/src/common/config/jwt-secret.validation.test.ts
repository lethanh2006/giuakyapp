import assert from 'node:assert/strict';
import test from 'node:test';
import { createJwtKey, requireJwtSecret } from './jwt-secret';
import { createHmac } from 'node:crypto';

test('từ chối JWT secret bị thiếu hoặc quá ngắn', () => {
  assert.throws(() => requireJwtSecret(undefined), /JWT_SECRET/);
  assert.throws(() => requireJwtSecret('short-secret'), /ít nhất 32 byte/);
  assert.throws(
    () => requireJwtSecret('replace_with_at_least_32_random_characters'),
    /JWT_SECRET/,
  );
});

test('trả về JWT secret hợp lệ đã được chuẩn hóa', () => {
  const secret = '0123456789abcdef0123456789abcdef';

  assert.equal(requireJwtSecret(`  ${secret}  `), secret);
});

test('khóa tạo sẵn giữ nguyên chữ ký HS256', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const message = 'header.payload';
  assert.equal(
    createHmac('sha256', createJwtKey(secret)).update(message).digest('hex'),
    createHmac('sha256', secret).update(message).digest('hex'),
  );
});
