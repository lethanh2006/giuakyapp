import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { getLogContext } from '@nrapp/observability';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import {
  UpstreamHttpException,
  createUpstreamErrorPayload,
} from '../http/upstream-error';
import type { RequestWithContext } from '../interfaces/request-context.interface';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import {
  CLIENT_REQUEST_ID_HEADER,
  REQUEST_ID_HEADER,
  RequestIdMiddleware,
} from '../middleware/request-id.middleware';
import { RequestOutcomeMiddleware } from '../middleware/request-outcome.middleware';
import type { StructuredLoggerService } from './logger';

interface LoggedEvent {
  level: string;
  eventName?: string;
  fields: Record<string, unknown>;
  message?: string;
}

class FakeResponse extends EventEmitter {
  statusCode = 200;
  headersSent = false;
  headers: Record<string, unknown> = {};
  body?: unknown;

  setHeader(name: string, value: unknown): void {
    this.headers[name.toLowerCase()] = value;
  }

  status(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    this.headersSent = true;
    this.emit('finish');
    return this;
  }
}

function fakeRequest(
  overrides: Record<string, unknown> = {},
): RequestWithContext {
  return {
    method: 'POST',
    headers: {},
    route: { path: '/api/auth/register' },
    baseUrl: '',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as RequestWithContext;
}

function fakeLogger(events: LoggedEvent[]): StructuredLoggerService {
  return {
    raw: {
      error(fields: Record<string, unknown>, message: string) {
        events.push({ level: 'error', fields, message });
      },
    },
    info(eventName: string, fields: Record<string, unknown>, message?: string) {
      events.push({ level: 'info', eventName, fields, message });
    },
    warn(eventName: string, fields: Record<string, unknown>, message?: string) {
      events.push({ level: 'warn', eventName, fields, message });
    },
    error(
      eventName: string,
      fields: Record<string, unknown>,
      message?: string,
    ) {
      events.push({ level: 'error', eventName, fields, message });
    },
  } as unknown as StructuredLoggerService;
}

function filterHost(request: RequestWithContext, response: FakeResponse) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as never;
}

function createFilter(logger: StructuredLoggerService): GlobalExceptionFilter {
  return new GlobalExceptionFilter(
    {
      httpAdapter: {
        reply(response: FakeResponse, body: unknown, statusCode: number) {
          response.status(statusCode).json(body);
        },
      },
    } as never,
    logger,
  );
}

test('Gateway luôn tạo request id chuẩn và chỉ giữ client id ở field riêng', () => {
  const request = fakeRequest({
    headers: { [REQUEST_ID_HEADER]: 'client-123' },
  });
  const response = new FakeResponse();
  let contextDuringRequest: Record<string, unknown> = {};

  new RequestIdMiddleware().use(request, response as never, () => {
    contextDuringRequest = getLogContext();
  });

  assert.notEqual(request.requestContext?.requestId, 'client-123');
  assert.match(request.requestContext?.requestId ?? '', /^[0-9a-f-]{36}$/);
  assert.equal(request.requestContext?.clientRequestId, 'client-123');
  assert.equal(request.headers[CLIENT_REQUEST_ID_HEADER], 'client-123');
  assert.equal(
    request.headers[REQUEST_ID_HEADER],
    request.requestContext?.requestId,
  );
  assert.equal(
    response.headers[REQUEST_ID_HEADER],
    request.requestContext?.requestId,
  );
  assert.equal(
    contextDuringRequest.request_id,
    request.requestContext?.requestId,
  );
  assert.equal(contextDuringRequest.client_request_id, 'client-123');
});

test('validation 422 chỉ tạo một terminal event và không log field value', () => {
  const events: LoggedEvent[] = [];
  const logger = fakeLogger(events);
  const request = fakeRequest({
    requestContext: {
      requestId: 'req-422',
    },
  });
  const response = new FakeResponse();
  new RequestOutcomeMiddleware(logger).use(
    request,
    response as never,
    () => {},
  );

  createFilter(logger).catch(
    new HttpException(
      {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: { fields: ['email'] },
      },
      422,
    ),
    filterHost(request, response),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].eventName, 'http.request.rejected');
  assert.equal(events[0].fields['error.code'], 'VALIDATION_ERROR');
  assert.deepEqual(events[0].fields['validation.fields'], ['email']);
  assert.doesNotMatch(JSON.stringify(events), /secret@example\.com/);
});

test('các 4xx dự kiến còn lại đều tạo đúng một terminal event', () => {
  const cases = [
    { statusCode: 400, code: 'BAD_REQUEST', level: 'info' },
    { statusCode: 401, code: 'UNAUTHORIZED', level: 'info' },
    { statusCode: 403, code: 'FORBIDDEN', level: 'warn' },
    { statusCode: 409, code: 'CONFLICT', level: 'info' },
  ];

  for (const testCase of cases) {
    const events: LoggedEvent[] = [];
    const logger = fakeLogger(events);
    const request = fakeRequest({
      requestContext: { requestId: `req-${testCase.statusCode}` },
    });
    const response = new FakeResponse();
    new RequestOutcomeMiddleware(logger).use(
      request,
      response as never,
      () => {},
    );

    createFilter(logger).catch(
      new HttpException(
        {
          statusCode: testCase.statusCode,
          code: testCase.code,
          message: 'Yêu cầu không hợp lệ',
        },
        testCase.statusCode,
      ),
      filterHost(request, response),
    );

    assert.equal(events.length, 1);
    assert.equal(events[0].level, testCase.level);
    assert.equal(events[0].eventName, 'http.request.rejected');
    assert.equal(events[0].fields['error.code'], testCase.code);
    assert.equal(
      events[0].fields['http.response.status_code'],
      testCase.statusCode,
    );
  }
});

test('404 không trả raw path và chỉ log route unmatched', () => {
  const events: LoggedEvent[] = [];
  const logger = fakeLogger(events);
  const request = fakeRequest({
    method: 'GET',
    route: undefined,
    originalUrl: '/private-user-slug?token=secret',
    requestContext: {
      requestId: 'req-404',
    },
  });
  const response = new FakeResponse();
  new RequestOutcomeMiddleware(logger).use(
    request,
    response as never,
    () => {},
  );

  createFilter(logger).catch(
    new HttpException('Cannot GET /private-user-slug?token=secret', 404),
    filterHost(request, response),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].fields['http.route'], 'unmatched');
  assert.equal(
    (response.body as Record<string, unknown>).message,
    'Không tìm thấy tài nguyên',
  );
  assert.doesNotMatch(
    JSON.stringify({ events, body: response.body }),
    /private-user-slug/,
  );
});

test('rate limit 429 đi qua cùng terminal logging contract', () => {
  const events: LoggedEvent[] = [];
  const logger = fakeLogger(events);
  const limiter = new RateLimitMiddleware({
    get(name: string) {
      return name === 'RATE_LIMIT_MAX_REQUESTS' ? '1' : '60000';
    },
  } as never);

  for (let index = 0; index < 2; index += 1) {
    const request = fakeRequest({
      requestContext: {
        requestId: `req-${index}`,
      },
    });
    const response = new FakeResponse();
    new RequestOutcomeMiddleware(logger).use(
      request,
      response as never,
      () => {},
    );
    limiter.use(request, response as never, () =>
      response.status(200).json({}),
    );
  }

  assert.equal(events.length, 1);
  assert.equal(events[0].level, 'warn');
  assert.equal(events[0].fields['http.response.status_code'], 429);
  assert.equal(events[0].fields['error.code'], 'RATE_LIMITED');
});

test('lỗi 500 do Gateway sở hữu chỉ ghi một detailed origin event', () => {
  const events: LoggedEvent[] = [];
  const logger = fakeLogger(events);
  const request = fakeRequest({
    method: 'GET',
    route: { path: '/api/users/:id' },
    requestContext: {
      requestId: 'req-500',
    },
  });
  const response = new FakeResponse();

  createFilter(logger).catch(
    new InternalServerErrorException('postgres://admin:password@db/app'),
    filterHost(request, response),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].level, 'error');
  assert.equal(
    (response.body as Record<string, unknown>).code,
    'INTERNAL_ERROR',
  );
  assert.equal(
    (response.body as Record<string, unknown>).message,
    'Internal server error',
  );
  assert.equal(
    typeof (response.body as Record<string, unknown>).errorId,
    'string',
  );
  assert.doesNotMatch(JSON.stringify(response.body), /postgres|password/);
});

test('upstream 5xx chỉ ghi summary và giữ nguyên errorId từ service gốc', () => {
  const events: LoggedEvent[] = [];
  const logger = fakeLogger(events);
  const request = fakeRequest({
    requestContext: {
      requestId: 'req-upstream',
    },
  });
  const response = new FakeResponse();
  const exception = new UpstreamHttpException(
    {
      statusCode: 503,
      code: 'PAYMENT_UNAVAILABLE',
      message: 'Internal server error',
      errorId: 'payment-error-1',
    },
    503,
    'payment',
  );

  createFilter(logger).catch(exception, filterHost(request, response));

  assert.equal(events.length, 1);
  assert.equal(events[0].eventName, 'http.upstream.failed');
  assert.equal(events[0].fields['error.id'], 'payment-error-1');
  assert.equal(events[0].fields['exception.stacktrace'], undefined);
  assert.equal(
    (response.body as Record<string, unknown>).errorId,
    'payment-error-1',
  );
});

test('payload upstream chỉ cho phép các field an toàn', () => {
  const payload = createUpstreamErrorPayload(
    {
      code: 'invalid input',
      message: ['email must be an email'],
      details: { fields: ['email'] },
      errorId: 'origin-1',
      stack: 'secret stack',
      token: 'secret-token',
      internalUrl: 'postgres://root:secret@db/app',
    },
    422,
    'auth',
  );

  assert.deepEqual(payload, {
    statusCode: 422,
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu không hợp lệ',
    details: { fields: ['email'] },
    errorId: 'origin-1',
  });
});
