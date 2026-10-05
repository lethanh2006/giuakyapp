import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/orders.schema';
import { Review, ReviewDocument } from '../../schemas/reviews.schema';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UpsertReviewDto } from './dto/upsert-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import {
  ListReviewsQueryDto,
  ReviewRangeQueryDto,
} from './dto/list-reviews-query.dto';

/** Chủ đơn được đánh giá/sửa đánh giá trong khoảng này kể từ lúc thu tiền. */
export const REVIEW_WINDOW_DAYS = 7;
const REVIEW_WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
/** Giới hạn số đánh giá trả về cho "đánh giá của tôi". */
const MY_REVIEWS_LIMIT = 200;

export type ReviewSummary = {
  total: number;
  averageRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  unanswered: number;
};

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Chủ đơn tạo hoặc sửa đánh giá cho đơn đã thanh toán. Một đơn chỉ có một
   * đánh giá; sau khi căn tin phản hồi thì đánh giá bị khóa.
   */
  async upsertReview(
    orderId: string,
    dto: UpsertReviewDto,
    user: AuthenticatedUser,
  ): Promise<Review> {
    const userId = this.requireUserId(user);

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Đơn hàng với ID '${orderId}' không tồn tại`);
    }
    if (!order.userId.equals(userId)) {
      throw new ForbiddenException('Bạn chỉ được đánh giá đơn hàng của mình');
    }
    if (order.status !== 'COMPLETED' || order.paymentStatus !== 'PAID') {
      throw new ConflictException('Chỉ đánh giá được đơn đã thanh toán');
    }
    const settledAt = order.paidAt ?? order.updatedAt;
    if (Date.now() - settledAt.getTime() > REVIEW_WINDOW_MS) {
      throw new ConflictException(
        `Đã quá ${REVIEW_WINDOW_DAYS} ngày kể từ khi thanh toán nên không thể đánh giá`,
      );
    }

    const comment = dto.comment?.trim();
    const update: UpdateQuery<ReviewDocument> = {
      $set: { rating: dto.rating, ...(comment ? { comment } : {}) },
      ...(comment ? {} : { $unset: { comment: '' } }),
      $setOnInsert: {
        orderNumber: order.orderNumber,
        userId,
        itemNames: order.items.map((item) => item.name),
      },
    };

    try {
      // repliedAt: null chặn ghi đè nếu admin vừa phản hồi; khi đó upsert chạm
      // unique index orderId và trả về lỗi trùng khóa.
      return await this.reviewModel
        .findOneAndUpdate({ orderId: order._id, repliedAt: null }, update, {
          new: true,
          upsert: true,
          runValidators: true,
        })
        .orFail()
        .exec();
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Đánh giá đã được căn tin phản hồi nên không thể chỉnh sửa',
        );
      }
      throw error;
    }
  }

  /** Đánh giá của chính người dùng, mới nhất trước. */
  async getMyReviews(user: AuthenticatedUser): Promise<Review[]> {
    const userId = this.requireUserId(user);
    return await this.reviewModel
      .find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MY_REVIEWS_LIMIT)
      .exec();
  }

  /** Danh sách đánh giá cho màn quản trị, có lọc và phân trang. */
  async listReviews(query: ListReviewsQueryDto) {
    const filter = this.buildRangeFilter(query);
    if (query.rating !== undefined) filter.rating = query.rating;
    if (query.replied !== undefined) {
      filter.repliedAt = query.replied ? { $ne: null } : null;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel
        .countDocuments(
          filter,
          Object.keys(filter).length === 0 ? { hint: '_id_' } : {},
        )
        .exec(),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Số đánh giá, điểm trung bình, phân bố theo sao và số đánh giá chưa phản hồi. */
  async getSummary(query: ReviewRangeQueryDto): Promise<ReviewSummary> {
    const filter = this.buildRangeFilter(query);
    const [groups, unanswered] = await Promise.all([
      this.reviewModel
        .aggregate<{
          _id: number;
          count: number;
        }>([
          { $match: filter },
          { $group: { _id: '$rating', count: { $sum: 1 } } },
        ])
        .exec(),
      this.reviewModel.countDocuments({ ...filter, repliedAt: null }).exec(),
    ]);

    const distribution: ReviewSummary['distribution'] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let total = 0;
    let ratingSum = 0;
    for (const { _id: rating, count } of groups) {
      if (rating in distribution) {
        distribution[rating as keyof typeof distribution] = count;
        total += count;
        ratingSum += rating * count;
      }
    }

    return {
      total,
      averageRating: total ? Math.round((ratingSum / total) * 100) / 100 : 0,
      distribution,
      unanswered,
    };
  }

  /** Admin trả lời hoặc sửa phản hồi cho một đánh giá. */
  async replyToReview(
    id: string,
    dto: ReplyReviewDto,
    admin: AuthenticatedUser,
  ): Promise<Review> {
    const adminId = this.requireUserId(admin);
    const review = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            replyMessage: dto.message,
            repliedAt: new Date(),
            repliedBy: adminId,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!review) {
      throw new NotFoundException(`Đánh giá với ID '${id}' không tồn tại`);
    }
    return review;
  }

  private buildRangeFilter(
    query: ReviewRangeQueryDto,
  ): QueryFilter<ReviewDocument> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải nhỏ hơn hoặc bằng thời gian kết thúc',
      );
    }

    const filter: QueryFilter<ReviewDocument> = {};
    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
    return filter;
  }

  private requireUserId(user: AuthenticatedUser): Types.ObjectId {
    const rawUserId = user._id ?? user.id;
    if (!rawUserId || !Types.ObjectId.isValid(rawUserId)) {
      throw new UnauthorizedException(
        'Thông tin người dùng không hợp lệ hoặc thiếu ID người dùng',
      );
    }
    return new Types.ObjectId(rawUserId);
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
