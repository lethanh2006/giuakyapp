import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ProfileSyncService } from './profile-sync.service';
import { UserService } from './user.service';

@Injectable()
export class UserProfileSyncConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly userService: UserService,
    private readonly profileSyncService: ProfileSyncService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(
      'user-profile-sync',
      (message, metadata) =>
        message &&
        typeof message === 'object' &&
        ('version' in message || 'eventId' in message)
          ? this.profileSyncService.handle(message)
          : this.userService.handleProfileSync(message, metadata),
    );
  }
}
