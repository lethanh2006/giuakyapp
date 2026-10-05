import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export const REVIEW_COMMENT_MAX_LENGTH = 500;

@Schema({ timestamps: true })
export class Review {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId!: Types.ObjectId;

  /** Bản sao mã đơn để màn quản trị không phải truy vấn lại Order. */
  @Prop({ required: true })
  orderNumber!: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  /** Bản sao tên món tại thời điểm đánh giá; vẫn đọc được khi món bị xóa. */
  @Prop({ type: [String], default: [] })
  itemNames!: string[];

  @Prop({ required: true, min: 1, max: 5, validate: Number.isInteger })
  rating!: number;

  @Prop({ required: false, maxlength: REVIEW_COMMENT_MAX_LENGTH })
  comment?: string;

  @Prop({ required: false, maxlength: REVIEW_COMMENT_MAX_LENGTH })
  replyMessage?: string;

  @Prop({ required: false })
  repliedAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false })
  repliedBy?: Types.ObjectId;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Mỗi đơn chỉ có một đánh giá; khóa này cũng làm điều kiện chống ghi đè đồng thời.
ReviewSchema.index({ orderId: 1 }, { unique: true });
// Danh sách quản trị và các bộ lọc theo sao / trạng thái phản hồi.
ReviewSchema.index({ createdAt: -1, _id: -1 });
ReviewSchema.index({ rating: 1, createdAt: -1, _id: -1 });
ReviewSchema.index({ repliedAt: 1, createdAt: -1, _id: -1 });
// Đánh giá của chính người dùng.
ReviewSchema.index({ userId: 1, createdAt: -1, _id: -1 });
