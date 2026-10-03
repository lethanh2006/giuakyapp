import { ProfileSyncService } from './profile-sync.service';
import {
  ProfileSyncState,
  ProfileSyncStateSchema,
} from '../../schemas/profile-sync-state.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { UserController } from './user.controller';
import { UserProfileSyncConsumer } from './user-profile-sync.consumer';
import { UserService } from './user.service';
import { GatewayIdentityGuard } from '../../common/guards/gateway-identity.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProfileSyncState.name, schema: ProfileSyncStateSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    ProfileSyncService,
    UserService,
    UserProfileSyncConsumer,
    GatewayIdentityGuard,
  ],
})
export class UserModule {}
