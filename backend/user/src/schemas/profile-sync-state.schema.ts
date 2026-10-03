import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProfileSyncStateDocument = HydratedDocument<ProfileSyncState>;

// Lưu cả tombstone sau DELETE; không TTL để event cũ không hồi sinh tài khoản.
@Schema({ collection: 'user_profile_sync_states' })
export class ProfileSyncState {
  @Prop({ type: String })
  _id!: string;

  @Prop({ required: true })
  version!: number;

  @Prop({ required: true })
  eventId!: string;
}

export const ProfileSyncStateSchema =
  SchemaFactory.createForClass(ProfileSyncState);
