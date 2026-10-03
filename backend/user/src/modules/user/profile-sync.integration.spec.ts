import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import {
  ProfileSyncState,
  ProfileSyncStateDocument,
  ProfileSyncStateSchema,
} from '../../schemas/profile-sync-state.schema';
import { ProfileSyncService } from './profile-sync.service';

const integration = process.env.OUTBOX_TEST_MONGO_URL
  ? describe
  : describe.skip;
integration('User sync với MongoDB replica set thật', () => {
  let connection: Connection;
  let users: Model<UserDocument>;
  let states: Model<ProfileSyncStateDocument>;
  let service: ProfileSyncService;
  const base = {
    action: 'CREATE',
    email: 'sync@example.com',
    role: 'user',
    username: 'Initial',
  };
  function event(
    userId: string,
    version: number,
    changes: Record<string, unknown> = {},
  ) {
    return { ...base, userId, version, eventId: randomUUID(), ...changes };
  }
  beforeAll(async () => {
    connection = await createConnection(process.env.OUTBOX_TEST_MONGO_URL!, {
      dbName: `user_sync_test_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    users = connection.model<UserDocument>(User.name, UserSchema);
    states = connection.model<ProfileSyncStateDocument>(
      ProfileSyncState.name,
      ProfileSyncStateSchema,
    );
    service = new ProfileSyncService(users, states);
    await service.onModuleInit();
  }, 30000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });
  it('snapshot mới nhất thắng, giữ tên đã đổi và không hồi sinh sau DELETE', async () => {
    const userId = new Types.ObjectId().toString();
    const latest = event(userId, 3, { action: 'UPDATE_ROLE', role: 'user' });
    await service.handle(latest);
    await users.updateOne({ _id: userId }, { $set: { username: 'Edited' } });
    await service.handle(latest);
    await service.handle(event(userId, 1));
    await service.handle(
      event(userId, 4, {
        action: 'UPDATE_EMAIL',
        email: 'new@example.com',
        role: 'user',
      }),
    );
    const user = await users.findById(userId).lean();
    expect(user?.username).toBe('Edited');
    expect(user?.role).toBe('user');
    expect(user?.email).toBe('new@example.com');
    await service.handle(event(userId, 5, { action: 'DELETE' }));
    await service.handle(latest);
    expect(await users.findById(userId)).toBeNull();
    expect((await states.findById(userId).lean())?.version).toBe(5);
  });
  it('profile lỗi thì version rollback, redelivery vẫn xử lý được', async () => {
    const userId = new Types.ObjectId().toString();
    jest.spyOn(users, 'updateOne').mockImplementationOnce(() => {
      throw new Error('Injected write failure');
    });
    const message = event(userId, 1);
    await expect(service.handle(message)).rejects.toThrow(
      'Injected write failure',
    );
    expect(await states.findById(userId)).toBeNull();
    await service.handle(message);
    expect((await states.findById(userId).lean())?.version).toBe(1);
  });
  it('consumer đồng thời hội tụ về version lớn nhất', async () => {
    const userId = new Types.ObjectId().toString();
    const results = await Promise.allSettled(
      [1, 3, 2].map((version) =>
        service.handle(
          event(userId, version, {
            email: 'concurrent@example.com',
            role: version === 3 ? 'admin' : 'user',
          }),
        ),
      ),
    );
    // Lỗi unique khi hai transaction cùng insert sẽ được broker redelivery.
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].status === 'rejected')
        await service.handle(
          event(userId, [1, 3, 2][i], {
            email: 'concurrent@example.com',
            role: [1, 3, 2][i] === 3 ? 'admin' : 'user',
          }),
        );
    }
    expect((await states.findById(userId).lean())?.version).toBe(3);
    expect((await users.findById(userId).lean())?.role).toBe('admin');
  });
});
