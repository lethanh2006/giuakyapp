import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ReviewSummaryQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Thời điểm bắt đầu khoảng lọc theo ngày đánh giá (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Thời điểm bắt đầu không đúng định dạng ISO 8601' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31T23:59:59.999Z',
    description: 'Thời điểm kết thúc khoảng lọc theo ngày đánh giá (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'Thời điểm kết thúc không đúng định dạng ISO 8601' },
  )
  to?: string;
}

export class ReviewQueryDto extends ReviewSummaryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'Lọc theo sao' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  rating?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true: đã phản hồi; false: chưa phản hồi',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'replied chỉ nhận true hoặc false' })
  replied?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số bản ghi mỗi trang phải là số nguyên' })
  @Min(1, { message: 'Số bản ghi mỗi trang phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Số bản ghi mỗi trang không được vượt quá 100' })
  limit?: number;
}
