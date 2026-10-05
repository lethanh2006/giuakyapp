import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Số sao' })
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Món ngon, lên món nhanh',
    maxLength: 500,
    description: 'Nhận xét thêm của người dùng',
  })
  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Nhận xét không được vượt quá 500 ký tự' })
  comment?: string;
}
