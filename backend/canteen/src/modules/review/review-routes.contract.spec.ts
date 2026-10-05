import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AUTHENTICATED_KEY } from '../../common/decorators/authenticated.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ReviewController } from './review.controller';

describe('Hợp đồng API đánh giá căn tin', () => {
  const prototype = ReviewController.prototype;
  const routes = Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const handler = Object.getOwnPropertyDescriptor(prototype, name)
        ?.value as object;
      return {
        path: Reflect.getMetadata(PATH_METADATA, handler) as string,
        method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
        authenticated: Reflect.getMetadata(AUTHENTICATED_KEY, handler) as
          | boolean
          | undefined,
        roles: Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined,
      };
    });

  it('có đủ năm route với đúng phương thức', () => {
    expect(
      routes.map(({ method, path }) => `${RequestMethod[method]} ${path}`),
    ).toEqual(
      expect.arrayContaining([
        'PUT orders/:id/review',
        'GET reviews/my',
        'GET reviews/summary',
        'GET reviews',
        'PATCH reviews/:id/reply',
      ]),
    );
    expect(routes).toHaveLength(5);
  });

  it('chủ đơn chỉ cần đăng nhập; danh sách, thống kê và phản hồi chỉ dành cho admin', () => {
    const byPath = new Map(routes.map((route) => [route.path, route]));
    expect(byPath.get('orders/:id/review')?.authenticated).toBe(true);
    expect(byPath.get('reviews/my')?.authenticated).toBe(true);
    for (const path of ['reviews', 'reviews/summary', 'reviews/:id/reply']) {
      expect(byPath.get(path)?.roles).toEqual(['ADMIN']);
    }
  });
});
