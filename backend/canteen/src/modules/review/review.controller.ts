import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Authenticated } from '../../common/decorators/authenticated.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { type AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import {
  ListReviewsQueryDto,
  ReviewRangeQueryDto,
} from './dto/list-reviews-query.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpsertReviewDto } from './dto/upsert-review.dto';
import { ReviewService } from './review.service';

@Controller('api/canteen')
@UseGuards(RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * PUT /api/canteen/orders/:id/review
   * Chủ đơn tạo hoặc sửa đánh giá cho đơn đã thanh toán.
   */
  @Put('orders/:id/review')
  @Authenticated()
  async upsertReview(
    @Param('id', new ParseObjectIdPipe('ID đơn hàng')) id: string,
    @Body() dto: UpsertReviewDto,
    @User() user: AuthenticatedUser,
  ) {
    return this.reviewService.upsertReview(id, dto, user);
  }

  /** GET /api/canteen/reviews/my — đánh giá của người dùng hiện tại. */
  @Get('reviews/my')
  @Authenticated()
  async getMyReviews(@User() user: AuthenticatedUser) {
    return this.reviewService.getMyReviews(user);
  }

  /** GET /api/canteen/reviews/summary — thống kê đánh giá cho admin. */
  @Get('reviews/summary')
  @Roles(Role.ADMIN)
  async getSummary(@Query() query: ReviewRangeQueryDto) {
    return this.reviewService.getSummary(query);
  }

  /** GET /api/canteen/reviews — danh sách đánh giá có lọc và phân trang. */
  @Get('reviews')
  @Roles(Role.ADMIN)
  async listReviews(@Query() query: ListReviewsQueryDto) {
    return this.reviewService.listReviews(query);
  }

  /** PATCH /api/canteen/reviews/:id/reply — admin phản hồi đánh giá. */
  @Patch('reviews/:id/reply')
  @Roles(Role.ADMIN)
  async replyToReview(
    @Param('id', new ParseObjectIdPipe('ID đánh giá')) id: string,
    @Body() dto: ReplyReviewDto,
    @User() user: AuthenticatedUser,
  ) {
    return this.reviewService.replyToReview(id, dto, user);
  }
}
