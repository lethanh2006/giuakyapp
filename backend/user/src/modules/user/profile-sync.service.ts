import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  ProfileSyncState,
  ProfileSyncStateDocument,
} from '../../schemas/profile-sync-state.schema';

export class InvalidProfileSyncMessage extends Error {}

@Injectable()
export class ProfileSyncService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(ProfileSyncState.name)
    private readonly states: Model<ProfileSyncStateDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.users.init();
    await this.states.init();
  }

  async handle(value: unknown): Promise<void> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new InvalidProfileSyncMessage('Invalid event');
    const message = value as Record<string, unknown>;
    const userId = requiredString(message.userId);
    const eventId = requiredString(message.eventId);
    const action = requiredString(message.action);
    const version = message.version;
    if (
      !/^[a-f0-9]{24}$/i.test(userId) ||
      typeof version !== 'number' ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      !['CREATE', 'UPDATE_EMAIL', 'UPDATE_ROLE', 'DELETE'].includes(action)
    ) {
      throw new InvalidProfileSyncMessage(
        'Invalid event identity/version/action',
      );
    }
    const snapshot =
      action === 'DELETE'
        ? null
        : {
            username: requiredString(message.username),
            email: requiredString(message.email),
            role: normalizeUserRole(message.role),
          };
    await this.users.db.transaction(
      async (session) => {
        const state = await this.states
          .findById(userId)
          .session(session)
          .lean()
          .exec();
        if (state && state.version >= version) return;
        // Ghi version và profile chung transaction. Concurrent consumer gây write conflict
        // sẽ retry transaction và đọc lại version mới nhất.
        await this.states
          .updateOne(
            { _id: userId },
            { $set: { version, eventId } },
            { upsert: true, session },
          )
          .exec();
        if (!snapshot) {
          await this.users.deleteOne({ _id: userId }, { session }).exec();
        } else {
          // Snapshot đầy đủ xử lý được UPDATE tới trước CREATE, giữ username đã chỉnh ở User.
          await this.users
            .updateOne(
              { _id: userId },
              {
                $set: { email: snapshot.email, role: snapshot.role },
                $setOnInsert: { username: snapshot.username },
              },
              { upsert: true, session, runValidators: true },
            )
            .exec();
        }
      },
      { writeConcern: { w: 'majority' } },
    );
  }
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new InvalidProfileSyncMessage('Missing event field');
  return value;
}

function normalizeUserRole(role: unknown): 'admin' | 'user' {
  return typeof role === 'string' && role.trim().toLowerCase() === 'admin'
    ? 'admin'
    : 'user';
}
