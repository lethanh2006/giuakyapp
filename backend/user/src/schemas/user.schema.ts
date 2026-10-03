import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, default: 'user', enum: ['admin', 'user'] })
  role!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
