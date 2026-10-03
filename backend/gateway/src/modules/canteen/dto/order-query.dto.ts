import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum OrderStatusQuery {
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderPaymentStatusQuery {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: OrderStatusQuery })
  @IsOptional()
  @IsEnum(OrderStatusQuery, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatusQuery;

  @ApiPropertyOptional({ enum: OrderPaymentStatusQuery })
  @IsOptional()
  @IsEnum(OrderPaymentStatusQuery, {
    message: 'Trạng thái thanh toán không hợp lệ',
  })
  paymentStatus?: OrderPaymentStatusQuery;

  @ApiPropertyOptional({ description: 'Lọc theo ID người đặt hàng' })
  @IsOptional()
  @IsMongoId({ message: 'ID người đặt hàng không đúng định dạng ObjectId' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Lọc danh sách món theo ID bàn ăn' })
  @IsOptional()
  @IsMongoId({ message: 'ID bàn ăn không đúng định dạng ObjectId' })
  tableId?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    description: 'Thời điểm bắt đầu khoảng lọc (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Thời điểm bắt đầu không đúng định dạng ISO 8601' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-31T23:59:59.999Z',
    description: 'Thời điểm kết thúc khoảng lọc (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'Thời điểm kết thúc không đúng định dạng ISO 8601' },
  )
  to?: string;

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
