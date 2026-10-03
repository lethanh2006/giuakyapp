import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Tên danh mục', example: 'Đồ uống' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mô tả danh mục',
    example: 'Các loại nước giải khát',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
