import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { InternalRequestSignatureService } from './internal-request-signature.service';

const strongSecret = '0123456789abcdef0123456789abcdef';

test('ký identity cho Auth bằng secret fallback từ JWT_SECRET', () => {
  const service = new InternalRequestSignatureService(
    new ConfigService({ JWT_SECRET: strongSecret, NODE_ENV: 'test' }),
  );
  const headers = service.signUserPayload(
    'encoded-user',
    'request-123',
    'auth',
    'GET:/api/auth/me',
  );
  const expected = createHmac('sha256', strongSecret)
    .update(
      `${headers['x-user-timestamp']}.request-123.encoded-user.GET:/api/auth/me`,
    )
    .digest('hex');

  assert.equal(headers['x-user-payload'], 'encoded-user');
  assert.equal(headers['x-user-signature'], expected);
});

test('từ chối gọi Auth/User khi không có secret mạnh', () => {
  const service = new InternalRequestSignatureService(
    new ConfigService({ JWT_SECRET: 'short', NODE_ENV: 'development' }),
  );

  assert.throws(
    () => service.signUserPayload('payload', 'request-123', 'user'),
    ServiceUnavailableException,
  );

  const placeholderService = new InternalRequestSignatureService(
    new ConfigService({
      AUTH_INTERNAL_SECRET: 'replace_with_at_least_32_random_characters',
      JWT_SECRET: strongSecret,
      NODE_ENV: 'development',
    }),
  );
  assert.throws(
    () => placeholderService.signUserPayload('payload', 'request-123', 'auth'),
    ServiceUnavailableException,
  );
});

test('ký identity Todo và ràng buộc method/path', () => {
  const service = new InternalRequestSignatureService(
    new ConfigService({
      TODO_INTERNAL_SECRET: strongSecret,
      NODE_ENV: 'development',
    }),
  );
  const headers = service.signUserPayload(
    'encoded-user',
    'request-456',
    'todo',
    'PATCH:/api/todo/task-id/status',
  );
  const expected = createHmac('sha256', strongSecret)
    .update(
      `${headers['x-user-timestamp']}.request-456.encoded-user.PATCH:/api/todo/task-id/status`,
    )
    .digest('hex');

  assert.equal(headers['x-user-signature'], expected);
});
