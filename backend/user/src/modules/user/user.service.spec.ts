import type { Model } from 'mongoose';
import type { StructuredLoggerService } from '../../common/logging/logger';
import type { UserDocument } from '../../schemas/user.schema';
import { UserService } from './user.service';

describe('UserService', () => {
  const userId = '507f1f77bcf86cd799439012';
  const exec = jest.fn();
  const findById = jest.fn(() => ({ lean: () => ({ exec }) }));
  const userModel = { findById } as unknown as Model<UserDocument>;
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredLoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('coalesces concurrent reads, caches for 5 seconds, then invalidates on write', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    let resolveRead!: (profile: unknown) => void;
    exec.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const service = new UserService(userModel, logger);

    const first = service.getMyProfile(userId);
    const second = service.getMyProfile(userId);
    expect(findById).toHaveBeenCalledTimes(1);

    const profile = { _id: userId, username: 'tester' };
    resolveRead(profile);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { user: profile },
      { user: profile },
    ]);

    await expect(service.getMyProfile(userId)).resolves.toEqual({
      user: profile,
    });
    expect(findById).toHaveBeenCalledTimes(1);

    const mutableProfile = {
      _id: userId,
      username: 'tester',
      email: 'tester@example.test',
      role: 'user',
      save: jest.fn().mockResolvedValue(undefined),
    };
    findById.mockResolvedValueOnce(mutableProfile);
    await service.updateName(userId, { username: 'updated' });

    const updatedProfile = { _id: userId, username: 'updated' };
    exec.mockResolvedValueOnce(updatedProfile);
    await expect(service.getMyProfile(userId)).resolves.toEqual({
      user: updatedProfile,
    });
    expect(mutableProfile.save).toHaveBeenCalledTimes(1);
    expect(findById).toHaveBeenCalledTimes(3);

    now.mockReturnValue(6_000);
    const refreshedProfile = { _id: userId, username: 'refreshed' };
    exec.mockResolvedValueOnce(refreshedProfile);
    await expect(service.getMyProfile(userId)).resolves.toEqual({
      user: refreshedProfile,
    });
    expect(findById).toHaveBeenCalledTimes(4);
  });
});
