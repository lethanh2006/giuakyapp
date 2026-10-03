import {
  InvalidProfileSyncMessage,
  ProfileSyncService,
} from './profile-sync.service';

describe('User nhận sự kiện outbox', () => {
  const message = {
    eventId: 'event-3',
    version: 3,
    userId: '507f1f77bcf86cd799439011',
    action: 'UPDATE_ROLE',
    email: 'new@example.com',
    role: 'user',
    username: 'Tên ban đầu',
  };
  function setup(currentVersion?: number) {
    const session = {};
    const users = {
      db: {
        transaction: jest.fn((fn: (s: unknown) => Promise<unknown>) =>
          fn(session),
        ),
      },
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    const states = {
      findById: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue(
                currentVersion === undefined
                  ? null
                  : { version: currentVersion },
              ),
          }),
        }),
      }),
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    return {
      service: new ProfileSyncService(users as never, states as never),
      users,
      states,
      session,
    };
  }
  it.each([3, 4])(
    'bỏ qua event trùng/cũ khi đã xử lý version %s',
    async (version) => {
      const { service, users, states } = setup(version);
      await service.handle(message);
      expect(users.updateOne).not.toHaveBeenCalled();
      expect(states.updateOne).not.toHaveBeenCalled();
    },
  );
  it('UPDATE tới trước CREATE vẫn tạo được snapshot, giữ tên profile đã chỉnh', async () => {
    const { service, users, states, session } = setup();
    await service.handle(message);
    expect(states.updateOne).toHaveBeenCalledWith(
      { _id: message.userId },
      { $set: { version: 3, eventId: 'event-3' } },
      { upsert: true, session },
    );
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: message.userId },
      {
        $set: { email: message.email, role: 'user' },
        $setOnInsert: { username: 'Tên ban đầu' },
      },
      { upsert: true, session, runValidators: true },
    );
  });
  it('DELETE lưu tombstone cùng transaction với xóa profile', async () => {
    const { service, users, states, session } = setup(2);
    await service.handle({ ...message, action: 'DELETE' });
    expect(states.updateOne).toHaveBeenCalled();
    expect(users.deleteOne).toHaveBeenCalledWith(
      { _id: message.userId },
      { session },
    );
  });
  it('CREATE cũ không hồi sinh profile sau DELETE', async () => {
    const { service, users } = setup(4);
    await service.handle({ ...message, action: 'CREATE', version: 1 });
    expect(users.updateOne).not.toHaveBeenCalled();
  });
  it.each([
    { version: 0 },
    { version: '3' },
    { userId: 'invalid' },
    { email: '' },
    { action: 'UNKNOWN' },
  ])('từ chối event không hợp lệ %j', async (changes) => {
    const { service, users } = setup();
    await expect(
      service.handle({ ...message, ...changes }),
    ).rejects.toBeInstanceOf(InvalidProfileSyncMessage);
    expect(users.db.transaction).not.toHaveBeenCalled();
  });
});
