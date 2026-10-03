import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Model } from 'mongoose';
import { GatewayIdentityGuard } from '../../common/guards/gateway-identity.guard';
import type { StructuredLoggerService } from '../../common/logging/logger';
import type { UserDocument } from '../../schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('User directory security', () => {
  function createService() {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn(() => ({ exec }));
    const sort = jest.fn(() => ({ lean }));
    const select = jest.fn(() => ({ sort }));
    const model = {
      find: jest.fn(() => ({ select })),
    } as unknown as Model<UserDocument>;
    return {
      service: new UserService(model, {} as StructuredLoggerService),
      select,
      sort,
    };
  }

  it('bắt buộc chữ ký Gateway cho danh bạ', () => {
    const handler = Object.getOwnPropertyDescriptor(
      UserController.prototype,
      'getAllUsers',
    )?.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];

    expect(guards).toContain(GatewayIdentityGuard);
  });

  it('chỉ admin nhận email và vai trò', async () => {
    const { service, select, sort } = createService();

    await service.getAllUsers({ _id: 'admin-id', role: 'ADMIN' });

    expect(select).toHaveBeenCalledWith({
      _id: 1,
      username: 1,
      email: 1,
      role: 1,
    });
    expect(sort).toHaveBeenCalledWith({ username: 1, _id: 1 });
  });

  it.each(['user'])('ẩn email và vai trò khỏi %s', async (role) => {
    const { service, select } = createService();

    await service.getAllUsers({ _id: 'viewer-id', role });

    expect(select).toHaveBeenCalledWith({ _id: 1, username: 1 });
  });
});
