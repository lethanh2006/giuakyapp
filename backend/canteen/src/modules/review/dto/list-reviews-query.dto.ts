import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/** Khoảng thời gian tạo đánh giá, dùng chung cho danh sách và thống kê. */
export class ReviewRangeQueryDto {
  @IsOptional()
  @IsISO8601({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Thời gian kết thúc không hợp lệ' })
  to?: string;
}

export class ListReviewsQueryDto extends ReviewRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  rating?: number;

  /** true: đã có phản hồi của căn tin; false: chưa phản hồi. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'replied chỉ nhận true hoặc false' })
  replied?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Giới hạn tối đa là 100' })
  limit = 20;
}
