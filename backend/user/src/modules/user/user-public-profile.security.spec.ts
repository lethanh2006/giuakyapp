import type { Model } from 'mongoose';
import type { StructuredLoggerService } from '../../common/logging/logger';
import type { UserDocument } from '../../schemas/user.schema';
import { UserService } from './user.service';

describe('User public profile', () => {
  it('chỉ trả id và username', async () => {
    const model = {
      findById: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'private@example.com',
        role: 'admin',
        username: 'Public name',
      }),
    } as unknown as Model<UserDocument>;
    const service = new UserService(model, {} as StructuredLoggerService);

    await expect(
      service.getPublicUserById('507f1f77bcf86cd799439011'),
    ).resolves.toEqual({
      user: {
        _id: '507f1f77bcf86cd799439011',
        username: 'Public name',
      },
    });
  });
});
