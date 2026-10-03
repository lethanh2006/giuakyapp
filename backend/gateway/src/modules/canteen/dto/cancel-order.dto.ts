import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Đặt nhầm món',
    description: 'Lý do hủy đơn hàng',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Lý do hủy đơn phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do hủy đơn không được vượt quá 500 ký tự' })
  reason?: string;
}
