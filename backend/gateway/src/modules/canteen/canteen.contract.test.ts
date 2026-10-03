import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of } from 'rxjs';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

test('Gateway chỉ nhận đơn có bàn, món và thanh toán tiền mặt', async () => {
  const payload = {
    tableId: '507f1f77bcf86cd799439011',
    items: [
      {
        menuItemId: '507f1f77bcf86cd799439012',
        quantity: 2,
        selectedOptions: [{ name: 'Thêm trứng' }],
      },
    ],
    paymentMethod: 'CASH',
  };
  assert.equal(
    (await validate(plainToInstance(CreateOrderDto, payload))).length,
    0,
  );
  for (const changes of [
    { tableId: undefined },
    { items: [] },
    { paymentMethod: 'VIETQR' },
  ]) {
    assert.ok(
      (
        await validate(
          plainToInstance(CreateOrderDto, { ...payload, ...changes }),
        )
      ).length > 0,
    );
  }
});

test('bộ lọc Gateway bỏ trạng thái bếp và hoàn tiền', async () => {
  for (const status of ['CREATED', 'COMPLETED', 'CANCELLED']) {
    assert.equal(
      (await validate(plainToInstance(OrderQueryDto, { status }))).length,
      0,
    );
  }
  for (const status of ['CONFIRMED', 'COOKING', 'READY', 'PAID']) {
    assert.ok(
      (await validate(plainToInstance(OrderQueryDto, { status }))).length > 0,
    );
  }
  assert.ok(
    (
      await validate(
        plainToInstance(OrderQueryDto, { paymentStatus: 'REFUNDED' }),
      )
    ).length > 0,
  );
});

test('route căn tin giữ CRUD và thu tiền, không còn API nghiệp vụ bếp/kho', () => {
  const prototype = CanteenController.prototype;
  const paths = Object.getOwnPropertyNames(prototype)
    .filter((key) => key !== 'constructor')
    .map(
      (key) =>
        Reflect.getMetadata(
          PATH_METADATA,
          Object.getOwnPropertyDescriptor(prototype, key)?.value as object,
        ) as string,
    );
  assert.ok(paths.includes('orders/:id/payment/cash'));
  for (const path of ['orders', 'tables', 'admin/menu', 'categories'])
    assert.ok(paths.includes(path));
  assert.ok(
    paths.every(
      (path) =>
        !/kitchen|inventory|analytics|allocate|\/confirm$|\/complete$/.test(
          path,
        ),
    ),
  );
});

test('thu tiền và lọc đơn theo bàn chuyển đúng API Canteen với danh tính đã ký', async () => {
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
  const user = { _id: '507f1f77bcf86cd799439011', role: 'admin' };
  await service.confirmCashPayment('507f1f77bcf86cd799439012', user);
  await service.getOrders(
    { tableId: '507f1f77bcf86cd799439013', paymentStatus: 'PENDING' },
    user,
  );
  assert.equal(
    calls[0].url,
    'http://canteen.test/api/canteen/orders/507f1f77bcf86cd799439012/payment/cash',
  );
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].headers['x-user-signature'], 'signed');
  assert.equal(calls[1].params.tableId, '507f1f77bcf86cd799439013');
});
