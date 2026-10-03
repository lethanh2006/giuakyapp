import { validate } from 'class-validator';
import type { Model } from 'mongoose';
import type { StructuredLoggerService } from '../../common/logging/logger';
import type { UserDocument } from '../../schemas/user.schema';
import { PublicUsersQueryDto } from './dto/public-users-query.dto';
import { UserService } from './user.service';

describe('Public directory batch', () => {
  const id = '507f1f77bcf86cd799439011';
  it('rejects malformed, duplicate and oversized batches', async () => {
    for (const ids of [['invalid'], [id, id], Array(101).fill(id), undefined]) {
      const dto = Object.assign(new PublicUsersQueryDto(), { ids });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
    expect(
      await validate(Object.assign(new PublicUsersQueryDto(), { ids: [id] })),
    ).toEqual([]);
  });

  it('returns only public fields and only queries the requested IDs', async () => {
    const exec = jest.fn().mockResolvedValue([
      {
        _id: id,
        username: 'Public name',
        email: 'private@example.com',
        role: 'admin',
      },
    ]);
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec,
    };
    const model = { find: jest.fn().mockReturnValue(query) };
    const service = new UserService(
      model as unknown as Model<UserDocument>,
      {} as StructuredLoggerService,
    );
    await expect(service.getPublicUsers([id])).resolves.toEqual({
      users: [{ _id: id, username: 'Public name' }],
    });
    expect(model.find).toHaveBeenCalledWith({ _id: { $in: [id] } });
    expect(query.select).toHaveBeenCalledWith({ _id: 1, username: 1 });
    await expect(service.getPublicUsers([])).resolves.toEqual({ users: [] });
    expect(model.find).toHaveBeenCalledTimes(1);
  });

  it('preserves admin fields only for an authenticated admin directory request', async () => {
    const row = {
      _id: id,
      username: 'Public name',
      email: 'private@example.com',
      role: 'user',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([row]),
    };
    const service = new UserService(
      { find: () => query } as unknown as Model<UserDocument>,
      {} as StructuredLoggerService,
    );
    await expect(
      service.getDirectoryUsers([id], { _id: id, role: 'admin' }),
    ).resolves.toEqual({ users: [row] });
    await expect(
      service.getDirectoryUsers([id], { _id: id, role: 'user' }),
    ).resolves.toEqual({ users: [{ _id: id, username: 'Public name' }] });
  });
});
