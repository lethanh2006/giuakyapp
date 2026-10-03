import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GATEWAY_ROLES_KEY } from '../../common/decorators/gateway-roles.decorator';
import { GatewayIdentityGuard } from '../../common/guards/gateway-identity.guard';
import { UserController } from './user.controller';
import type { UserService } from './user.service';

const controllerHandler = (name: string): object => {
  const handler = Object.getOwnPropertyDescriptor(
    UserController.prototype,
    name,
  )?.value as unknown;
  if (typeof handler !== 'function') throw new Error(`Missing handler ${name}`);
  return handler;
};

describe('User internal route compatibility', () => {
  it('requires a signed identity for the directory batch with admin-dependent fields', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler('getDirectoryUsers'),
    ) as unknown[];
    expect(guards).toContain(GatewayIdentityGuard);
  });
  it('giữ lookup tương thích không yêu cầu chữ ký', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler('getInternalUser'),
    ) as unknown[] | undefined;

    expect(guards).toBeUndefined();
  });

  it('lookup tương thích chỉ gọi profile công khai', async () => {
    const getPublicUserById = jest.fn().mockResolvedValue({
      user: { _id: 'user-id', username: 'Nguyễn An' },
    });
    const getUserById = jest.fn();
    const controller = new UserController({
      getPublicUserById,
      getUserById,
    } as unknown as UserService);

    await expect(controller.getInternalUser('user-id')).resolves.toEqual({
      user: { _id: 'user-id', username: 'Nguyễn An' },
    });
    expect(getPublicUserById).toHaveBeenCalledWith('user-id');
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('bắt buộc chữ ký cho profile đầy đủ của admin', () => {
    const handler = controllerHandler('getInternalUserForAdmin');
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    const roles = Reflect.getMetadata(GATEWAY_ROLES_KEY, handler) as string[];

    expect(guards).toContain(GatewayIdentityGuard);
    expect(roles).toEqual(['admin']);
  });

  it('bắt buộc chữ ký cho internal mutation', () => {
    const createGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler('createProfile'),
    ) as unknown[];
    const roleGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      controllerHandler('updateInternalRole'),
    ) as unknown[];

    expect(createGuards).toContain(GatewayIdentityGuard);
    expect(roleGuards).toContain(GatewayIdentityGuard);
  });
});
