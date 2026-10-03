import { InvalidProfileSyncMessage } from './profile-sync.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StructuredLoggerService } from '../../common/logging/logger';
import type { RabbitMessageMetadata } from '../rabbitmq/rabbitmq.service';
import { User, UserDocument } from '../../schemas/user.schema';
import type { CreateProfileDto } from './dto/create-profile.dto';
import type { UpdateNameDto } from './dto/update-name.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

interface ProfileSyncMessage {
  action?: unknown;
  userId?: unknown;
  username?: unknown;
  email?: unknown;
  role?: unknown;
}

const MY_PROFILE_CACHE_TTL_MS = 5_000;
const MAX_MY_PROFILE_CACHE_ENTRIES = 512;

@Injectable()
export class UserService {
  private readonly completedProfileReads = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  private readonly pendingProfileReads = new Map<string, Promise<unknown>>();
  private profileReadGeneration = 0;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createProfile(dto: CreateProfileDto) {
    const existingUser = await this.userModel.findById(dto.userId);
    if (existingUser) {
      throw this.httpError(
        HttpStatus.BAD_REQUEST,
        'User profile already exists.',
      );
    }

    const user = await this.userModel.create({
      _id: dto.userId,
      username: dto.username,
      email: dto.email,
    });
    this.invalidateProfileReads();
    return {
      message: 'User profile created successfully.',
      user,
    };
  }

  async getMyProfile(userId: string) {
    const generation = this.profileReadGeneration;
    const key = `${generation}:${userId}`;
    const cached = this.completedProfileReads.get(key);
    if (cached && cached.expiresAt > Date.now()) return { user: cached.value };
    if (cached) this.completedProfileReads.delete(key);

    let pending = this.pendingProfileReads.get(key);
    if (!pending) {
      pending = this.userModel.findById(userId).lean().exec();
      if (this.pendingProfileReads.size < MAX_MY_PROFILE_CACHE_ENTRIES) {
        this.pendingProfileReads.set(key, pending);
      }
    }
    try {
      const user = await pending;
      if (!user) {
        throw this.httpError(
          HttpStatus.UNAUTHORIZED,
          'Phiên đăng nhập không còn hợp lệ.',
        );
      }
      if (generation === this.profileReadGeneration) {
        this.rememberProfileRead(key, user);
      }
      return { user };
    } finally {
      if (this.pendingProfileReads.get(key) === pending) {
        this.pendingProfileReads.delete(key);
      }
    }
  }

  private rememberProfileRead(key: string, value: unknown): void {
    if (this.completedProfileReads.size >= MAX_MY_PROFILE_CACHE_ENTRIES) {
      const oldestKey: string | undefined = Array.from(
        this.completedProfileReads.keys(),
      )[0];
      if (oldestKey !== undefined) this.completedProfileReads.delete(oldestKey);
    }
    this.completedProfileReads.set(key, {
      expiresAt: Date.now() + MY_PROFILE_CACHE_TTL_MS,
      value,
    });
  }

  private invalidateProfileReads(): void {
    // Local writes and profile-sync events invalidate the one-replica cache.
    this.profileReadGeneration += 1;
    this.completedProfileReads.clear();
  }

  async getPublicUsers(ids: string[]) {
    return this.getDirectoryUsers(ids, { _id: '', role: 'user' });
  }

  async getDirectoryUsers(ids: string[], viewer: AuthenticatedUser) {
    if (ids.length === 0) return { users: [] };
    const isAdmin = viewer.role?.toLowerCase() === 'admin';
    const users = await this.userModel
      .find({ _id: { $in: ids } })
      .select(
        isAdmin
          ? { _id: 1, username: 1, email: 1, role: 1 }
          : { _id: 1, username: 1 },
      )
      .lean()
      .exec();
    return {
      users: users.map(({ _id, username, email, role }) =>
        isAdmin ? { _id, username, email, role } : { _id, username },
      ),
    };
  }

  async updateName(userId: string, dto: UpdateNameDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw this.httpError(HttpStatus.NOT_FOUND, 'User not found.');
    }

    if (dto.username) {
      user.username = dto.username;
      await user.save();
      this.invalidateProfileReads();
    }

    return {
      message: 'Username updated successfully.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getAllUsers(viewer: AuthenticatedUser) {
    const isAdmin = viewer.role?.toLowerCase() === 'admin';
    const users = await this.userModel
      .find()
      .select(
        isAdmin
          ? { _id: 1, username: 1, email: 1, role: 1 }
          : { _id: 1, username: 1 },
      )
      .sort({ username: 1, _id: 1 })
      .lean()
      .exec();
    return { users };
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw this.httpError(HttpStatus.NOT_FOUND, 'User not found.');
    }
    return { user };
  }

  async getPublicUserById(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw this.httpError(HttpStatus.NOT_FOUND, 'User not found.');
    }
    return {
      user: {
        _id: user._id,
        username: user.username,
      },
    };
  }

  async updateRole(userId: string, dto: UpdateRoleDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw this.httpError(HttpStatus.NOT_FOUND, 'User profile not found.');
    }

    user.role = dto.role;
    await user.save();
    this.invalidateProfileReads();
    return {
      message: 'User role updated successfully.',
      user,
    };
  }

  async handleProfileSync(
    value: unknown,
    metadata: RabbitMessageMetadata,
  ): Promise<void> {
    const message = this.toSyncMessage(value);
    const action = typeof message.action === 'string' ? message.action : '';
    if (!['CREATE', 'UPDATE_EMAIL', 'UPDATE_ROLE', 'DELETE'].includes(action)) {
      return;
    }
    const rawUserId =
      typeof message.userId === 'string' ? message.userId : undefined;
    const logContext = {
      requestId: metadata.requestId ?? 'unknown',
      queueName: metadata.queueName,
      action,
      ...(rawUserId ? { userId: rawUserId } : {}),
    };

    const userId = this.requiredString(message.userId, 'userId');
    if (!/^[a-f0-9]{24}$/i.test(userId))
      throw new InvalidProfileSyncMessage('Invalid userId');
    if (action === 'CREATE') {
      const existingUser = await this.userModel.findById(userId);
      if (!existingUser) {
        await this.userModel.create({
          _id: userId,
          username: this.requiredString(message.username, 'username'),
          email: this.requiredString(message.email, 'email'),
          role: normalizeUserRole(message.role),
        });
        this.invalidateProfileReads();
        this.logger.info('rabbitmq_message_processed', {
          ...logContext,
          outcome: 'profile_created',
        });
      } else {
        this.logger.info('rabbitmq_message_processed', {
          ...logContext,
          outcome: 'profile_already_exists',
        });
      }
      return;
    }

    if (action === 'UPDATE_EMAIL') {
      const user = await this.userModel.findById(userId);
      if (user) {
        user.email = this.requiredString(message.email, 'email');
        await user.save();
        this.invalidateProfileReads();
        this.logger.info('rabbitmq_message_processed', {
          ...logContext,
          outcome: 'email_updated',
        });
      } else {
        this.logger.warn('rabbitmq_message_rejected', {
          ...logContext,
          reason: 'profile_not_found',
        });
      }
      return;
    }

    if (action === 'UPDATE_ROLE') {
      const user = await this.userModel.findById(userId);
      if (user) {
        user.role = normalizeUserRole(message.role);
        await user.save();
        this.invalidateProfileReads();
        this.logger.info('rabbitmq_message_processed', {
          ...logContext,
          outcome: 'role_updated',
        });
      } else {
        this.logger.warn('rabbitmq_message_rejected', {
          ...logContext,
          reason: 'profile_not_found',
        });
      }
      return;
    }

    if (action === 'DELETE') {
      await this.userModel.findByIdAndDelete(userId);
      this.invalidateProfileReads();
      this.logger.info('rabbitmq_message_processed', {
        ...logContext,
        outcome: 'profile_deleted',
      });
    }
  }

  private toSyncMessage(value: unknown): ProfileSyncMessage {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new InvalidProfileSyncMessage(
        'RabbitMQ profile sync message must be an object',
      );
    }
    return value;
  }

  private requiredString(value: unknown, field: string): string {
    const normalized = typeof value === 'string' ? value : '';
    if (!normalized)
      throw new InvalidProfileSyncMessage(`${field} is required`);
    return normalized;
  }

  private httpError(status: HttpStatus, message: string): HttpException {
    return new HttpException({ message }, status);
  }
}

function normalizeUserRole(role: unknown): 'admin' | 'user' {
  return typeof role === 'string' && role.trim().toLowerCase() === 'admin'
    ? 'admin'
    : 'user';
}
