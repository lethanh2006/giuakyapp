import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of } from 'rxjs';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { UpsertReviewDto } from './dto/upsert-review.dto';

test('đánh giá chỉ nhận số sao nguyên 1-5 và nhận xét tối đa 500 ký tự', async () => {
  assert.equal(
    (await validate(plainToInstance(UpsertReviewDto, { rating: 5 }))).length,
    0,
  );
  for (const payload of [
    {},
    { rating: 0 },
    { rating: 6 },
    { rating: 4.5 },
    { rating: 5, comment: 'a'.repeat(501) },
  ]) {
    assert.ok(
      (await validate(plainToInstance(UpsertReviewDto, payload))).length > 0,
    );
  }
});

test('phản hồi được cắt khoảng trắng và không được rỗng', async () => {
  const dto = plainToInstance(ReplyReviewDto, { message: '  Cảm ơn  ' });
  assert.equal((await validate(dto)).length, 0);
  assert.equal(dto.message, 'Cảm ơn');
  for (const message of ['', '   ', 'a'.repeat(501)]) {
    assert.ok(
      (await validate(plainToInstance(ReplyReviewDto, { message }))).length > 0,
    );
  }
});

test('bộ lọc đánh giá chuyển chuỗi query sang số/boolean và chặn giá trị sai', async () => {
  const dto = plainToInstance(ReviewQueryDto, {
    rating: '1',
    replied: 'false',
    page: '2',
  });
  assert.equal((await validate(dto)).length, 0);
  assert.equal(dto.rating, 1);
  assert.equal(dto.replied, false);
  assert.equal(dto.page, 2);
  for (const query of [
    { rating: '9' },
    { replied: 'maybe' },
    { limit: '500' },
  ]) {
    assert.ok(
      (await validate(plainToInstance(ReviewQueryDto, query))).length > 0,
    );
  }
});

test('route đánh giá đúng phương thức; danh sách, thống kê và phản hồi chỉ dành cho admin', () => {
  const prototype = CanteenController.prototype;
  const routes = new Map<string, string[] | undefined>(
    Object.getOwnPropertyNames(prototype)
      .filter((key) => key !== 'constructor')
      .map((key) => {
        const handler = Object.getOwnPropertyDescriptor(prototype, key)
          ?.value as object;
        const method = Reflect.getMetadata(
          METHOD_METADATA,
          handler,
        ) as RequestMethod;
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
        return [
          `${RequestMethod[method]} ${path}`,
          Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined,
        ] as const;
      }),
  );
  assert.ok(routes.has('PUT orders/:id/review'));
  assert.ok(routes.has('GET reviews/my'));
  assert.equal(routes.get('GET reviews/my'), undefined);
  for (const route of [
    'GET reviews',
    'GET reviews/summary',
    'PATCH reviews/:id/reply',
  ]) {
    assert.deepEqual(routes.get(route), ['ADMIN']);
  }
});

test('Gateway chuyển đúng API Canteen cho đánh giá với danh tính đã ký', async () => {
  const calls: Array<Record<string, any>> = [];
  const service = new CanteenService(
    {
      request: (request: Record<string, any>) => {
        calls.push(request);
        return of({ data: { ok: true } });
      },
    } as never,
    { get: () => 'http://canteen.test' } as never,
    { signUserPayload: () => ({ 'x-user-signature': 'signed' }) } as never,
    { requestContext: { requestId: 'request-test' } } as never,
  );
  const user = { _id: '507f1f77bcf86cd799439011', role: 'user' };
  const orderId = '507f1f77bcf86cd799439012';
  const reviewId = '507f1f77bcf86cd799439013';

  await service.upsertReview(orderId, { rating: 4 }, user);
  await service.getMyReviews(user);
  await service.getReviews({ rating: 1, replied: false }, user);
  await service.getReviewSummary({ from: '2026-10-01T00:00:00.000Z' }, user);
  await service.replyToReview(reviewId, { message: 'Cảm ơn' }, user);

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      `PUT http://canteen.test/api/canteen/orders/${orderId}/review`,
      'GET http://canteen.test/api/canteen/reviews/my',
      'GET http://canteen.test/api/canteen/reviews',
      'GET http://canteen.test/api/canteen/reviews/summary',
      `PATCH http://canteen.test/api/canteen/reviews/${reviewId}/reply`,
    ],
  );
  assert.deepEqual(calls[0].data, { rating: 4 });
  assert.deepEqual(calls[2].params, { rating: 1, replied: false });
  assert.ok(
    calls.every((call) => call.headers['x-user-signature'] === 'signed'),
  );
});
