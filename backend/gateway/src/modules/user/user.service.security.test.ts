import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { UserService } from './user.service';

test('admin profile dùng internal endpoint và identity đã ký', async () => {
  let capturedRequest: Record<string, unknown> | undefined;
  const httpService = {
    axiosRef: {
      request: (config: Record<string, unknown>) => {
        capturedRequest = config;
        return Promise.resolve({ data: { user: { _id: 'target-user' } } });
      },
    },
  } as unknown as HttpService;
  const config = new ConfigService({
    JWT_SECRET: '0123456789abcdef0123456789abcdef',
    USER_SERVICE_URL: 'http://user:5000',
  });
  const request = {
    requestContext: {
      requestId: 'request-123',
    },
  } as RequestWithContext;
  const service = new UserService(
    httpService,
    config,
    request,
    new InternalRequestSignatureService(config),
  );

  await service.getFullProfileByAdmin('target-user', {
    _id: 'admin-user',
    role: 'admin',
  });

  assert.equal(
    capturedRequest?.url,
    'http://user:5000/api/user/internal/admin/target-user',
  );
  const headers = capturedRequest?.headers as Record<string, string>;
  assert.equal(headers['x-request-id'], 'request-123');
  assert.equal(typeof headers['x-user-signature'], 'string');
});
