import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpsertReviewDto } from './dto/upsert-review.dto';
import { REVIEW_WINDOW_DAYS, ReviewService } from './review.service';

const DAY_MS = 24 * 60 * 60 * 1000;

type TestOrder = {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  status: string;
  paymentStatus: string;
  paidAt?: Date;
  updatedAt: Date;
  items: Array<{ name: string }>;
};

describe('Đánh giá đơn hàng căn tin', () => {
  const ownerId = new Types.ObjectId();
  const adminId = new Types.ObjectId();
  const owner = { _id: ownerId.toString(), role: 'user' };
  const admin = { _id: adminId.toString(), role: 'admin' };

  function createService(
    orderOverrides: Partial<TestOrder> | null = {},
    reviewResult: unknown = { rating: 5 },
  ) {
    const order: TestOrder | null =
      orderOverrides === null
        ? null
        : {
            _id: new Types.ObjectId(),
            orderNumber: '#1001',
            userId: ownerId,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paidAt: new Date(),
            updatedAt: new Date(),
            items: [{ name: 'Cơm tấm' }, { name: 'Trà đá' }],
            ...orderOverrides,
          };
    const orderModel = {
      findById: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(order),
      })),
    };
    const upsertChain = {
      orFail: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(reviewResult),
    };
    const reviewModel = {
      findOneAndUpdate: jest.fn<typeof upsertChain, unknown[]>(
        () => upsertChain,
      ),
      findByIdAndUpdate: jest.fn<{ exec: jest.Mock }, unknown[]>(() => ({
        exec: jest.fn().mockResolvedValue(reviewResult),
      })),
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };
    const service = new ReviewService(
      reviewModel as never,
      orderModel as never,
    );
    return { service, order, orderModel, reviewModel, upsertChain };
  }

  describe('upsertReview', () => {
    it('chủ đơn đã thanh toán tạo đánh giá và lưu bản sao mã đơn, tên món', async () => {
      const { service, order, reviewModel } = createService();
      await service.upsertReview(
        order!._id.toString(),
        { rating: 4, comment: '  Món ngon  ' },
        owner,
      );

      const [filter, update, options] = reviewModel.findOneAndUpdate.mock
        .calls[0] as unknown as [
        Record<string, unknown>,
        Record<string, Record<string, unknown>>,
        Record<string, unknown>,
      ];
      expect(filter).toEqual({ orderId: order!._id, repliedAt: null });
      expect(update.$set).toEqual({ rating: 4, comment: 'Món ngon' });
      expect(update.$unset).toBeUndefined();
      expect(update.$setOnInsert).toMatchObject({
        orderNumber: '#1001',
        itemNames: ['Cơm tấm', 'Trà đá'],
      });
      expect(options).toMatchObject({ upsert: true, new: true });
    });

    it.each([undefined, '', '   '])(
      'nhận xét %p được xóa khỏi đánh giá thay vì lưu chuỗi rỗng',
      async (comment) => {
        const { service, order, reviewModel } = createService();
        await service.upsertReview(
          order!._id.toString(),
          { rating: 3, comment },
          owner,
        );
        const update = reviewModel.findOneAndUpdate.mock.calls[0][1] as Record<
          string,
          Record<string, unknown>
        >;
        expect(update.$set).toEqual({ rating: 3 });
        expect(update.$unset).toEqual({ comment: '' });
      },
    );

    it('từ chối khi đơn không tồn tại', async () => {
      const { service } = createService(null);
      await expect(
        service.upsertReview(
          new Types.ObjectId().toString(),
          { rating: 5 },
          owner,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('từ chối người không phải chủ đơn, kể cả admin', async () => {
      const { service, order, reviewModel } = createService();
      for (const user of [admin, { _id: new Types.ObjectId().toString() }]) {
        await expect(
          service.upsertReview(order!._id.toString(), { rating: 5 }, user),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(reviewModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each([
      { status: 'CREATED', paymentStatus: 'PENDING' },
      { status: 'CANCELLED', paymentStatus: 'PENDING' },
      { status: 'COMPLETED', paymentStatus: 'PENDING' },
    ])('từ chối đơn chưa thanh toán xong %j', async (overrides) => {
      const { service, order, reviewModel } = createService(overrides);
      await expect(
        service.upsertReview(order!._id.toString(), { rating: 5 }, owner),
      ).rejects.toThrow('Chỉ đánh giá được đơn đã thanh toán');
      expect(reviewModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('cho phép đúng hạn và từ chối khi quá thời hạn tính từ lúc thu tiền', async () => {
      const inWindow = createService({
        paidAt: new Date(Date.now() - (REVIEW_WINDOW_DAYS - 1) * DAY_MS),
      });
      await expect(
        inWindow.service.upsertReview(
          inWindow.order!._id.toString(),
          { rating: 5 },
          owner,
        ),
      ).resolves.toBeDefined();

      const expired = createService({
        paidAt: new Date(Date.now() - (REVIEW_WINDOW_DAYS + 1) * DAY_MS),
      });
      await expect(
        expired.service.upsertReview(
          expired.order!._id.toString(),
          { rating: 5 },
          owner,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(expired.reviewModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('dùng updatedAt khi đơn cũ chưa có paidAt', async () => {
      const { service, order } = createService({
        paidAt: undefined,
        updatedAt: new Date(Date.now() - (REVIEW_WINDOW_DAYS + 1) * DAY_MS),
      });
      await expect(
        service.upsertReview(order!._id.toString(), { rating: 5 }, owner),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('báo xung đột khi đánh giá đã được phản hồi (trùng khóa orderId)', async () => {
      const { service, order, upsertChain } = createService();
      upsertChain.exec.mockRejectedValueOnce({ code: 11000 });
      await expect(
        service.upsertReview(order!._id.toString(), { rating: 1 }, owner),
      ).rejects.toThrow('không thể chỉnh sửa');
    });

    it('không che lỗi hạ tầng khác', async () => {
      const { service, order, upsertChain } = createService();
      const failure = new Error('mongo down');
      upsertChain.exec.mockRejectedValueOnce(failure);
      await expect(
        service.upsertReview(order!._id.toString(), { rating: 1 }, owner),
      ).rejects.toBe(failure);
    });

    it('từ chối danh tính thiếu hoặc sai ID', async () => {
      const { service, order } = createService();
      await expect(
        service.upsertReview(order!._id.toString(), { rating: 5 }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.upsertReview(
          order!._id.toString(),
          { rating: 5 },
          { _id: 'x' },
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('truy vấn', () => {
    it('đánh giá của tôi lọc theo userId, mới nhất trước và có giới hạn', async () => {
      const { service, reviewModel } = createService();
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      reviewModel.find.mockReturnValue(chain);
      await service.getMyReviews(owner);
      expect(reviewModel.find).toHaveBeenCalledWith({ userId: ownerId });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
      expect(chain.limit).toHaveBeenCalledWith(200);
    });

    it('danh sách admin áp dụng lọc sao, phản hồi, khoảng ngày và phân trang', async () => {
      const { service, reviewModel } = createService();
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ rating: 2 }]),
      };
      reviewModel.find.mockReturnValue(chain);
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(45),
      });

      const result = await service.listReviews({
        rating: 2,
        replied: false,
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T00:00:00.000Z',
        page: 2,
        limit: 20,
      });

      expect(reviewModel.find).toHaveBeenCalledWith({
        rating: 2,
        repliedAt: null,
        createdAt: {
          $gte: new Date('2026-10-01T00:00:00.000Z'),
          $lte: new Date('2026-10-31T00:00:00.000Z'),
        },
      });
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('replied=true chỉ lấy đánh giá đã có phản hồi', async () => {
      const { service, reviewModel } = createService();
      reviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      await service.listReviews({ replied: true, page: 1, limit: 20 });
      expect(reviewModel.find).toHaveBeenCalledWith({
        repliedAt: { $ne: null },
      });
    });

    it('từ chối khoảng ngày đảo ngược', async () => {
      const { service } = createService();
      await expect(
        service.getSummary({
          from: '2026-10-31T00:00:00.000Z',
          to: '2026-10-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('thống kê tính trung bình, phân bố đủ 5 mức và số chưa phản hồi', async () => {
      const { service, reviewModel } = createService();
      reviewModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 5, count: 2 },
          { _id: 4, count: 1 },
          { _id: 1, count: 1 },
        ]),
      });
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      await expect(service.getSummary({})).resolves.toEqual({
        total: 4,
        averageRating: 3.75,
        distribution: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 },
        unanswered: 3,
      });
      expect(reviewModel.countDocuments).toHaveBeenCalledWith({
        repliedAt: null,
      });
    });

    it('thống kê rỗng trả về 0 thay vì NaN', async () => {
      const { service, reviewModel } = createService();
      reviewModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      await expect(service.getSummary({})).resolves.toMatchObject({
        total: 0,
        averageRating: 0,
        unanswered: 0,
      });
    });
  });

  describe('replyToReview', () => {
    it('ghi nội dung, thời điểm và người phản hồi', async () => {
      const { service, reviewModel } = createService();
      const reviewId = new Types.ObjectId().toString();
      await service.replyToReview(reviewId, { message: 'Cảm ơn bạn' }, admin);
      const [id, update] = reviewModel.findByIdAndUpdate.mock
        .calls[0] as unknown as [string, { $set: Record<string, unknown> }];
      expect(id).toBe(reviewId);
      expect(update.$set).toMatchObject({
        replyMessage: 'Cảm ơn bạn',
        repliedBy: adminId,
      });
      expect(update.$set.repliedAt).toBeInstanceOf(Date);
    });

    it('báo 404 khi đánh giá không tồn tại', async () => {
      const { service } = createService({}, null);
      await expect(
        service.replyToReview(
          new Types.ObjectId().toString(),
          { message: 'Cảm ơn' },
          admin,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('DTO', () => {
    it('chỉ nhận số sao nguyên từ 1 đến 5 và nhận xét tối đa 500 ký tự', async () => {
      const valid = { rating: 5, comment: 'Ngon' };
      expect(
        await validate(plainToInstance(UpsertReviewDto, valid)),
      ).toHaveLength(0);
      expect(
        await validate(plainToInstance(UpsertReviewDto, { rating: 3 })),
      ).toHaveLength(0);
      for (const changes of [
        { rating: 0 },
        { rating: 6 },
        { rating: 3.5 },
        { rating: '5' },
        { rating: undefined },
        { comment: 'a'.repeat(501) },
      ]) {
        expect(
          await validate(
            plainToInstance(UpsertReviewDto, { ...valid, ...changes }),
          ),
        ).not.toHaveLength(0);
      }
    });

    it('phản hồi không được rỗng hoặc chỉ chứa khoảng trắng', async () => {
      const dto = plainToInstance(ReplyReviewDto, { message: '  Cảm ơn  ' });
      expect(await validate(dto)).toHaveLength(0);
      expect(dto.message).toBe('Cảm ơn');
      for (const message of ['', '   ', 'a'.repeat(501)]) {
        expect(
          await validate(plainToInstance(ReplyReviewDto, { message })),
        ).not.toHaveLength(0);
      }
    });

    it('chuyển query chuỗi thành số/boolean và chặn giá trị sai', async () => {
      const dto = plainToInstance(ListReviewsQueryDto, {
        rating: '2',
        replied: 'false',
        page: '3',
      });
      expect(await validate(dto)).toHaveLength(0);
      expect(dto).toMatchObject({ rating: 2, replied: false, page: 3 });
      for (const query of [
        { rating: '6' },
        { replied: 'maybe' },
        { limit: '101' },
        { from: 'hôm qua' },
      ]) {
        expect(
          await validate(plainToInstance(ListReviewsQueryDto, query)),
        ).not.toHaveLength(0);
      }
    });
  });
});
