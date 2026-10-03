import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemOptionDto } from './create-menu-item.dto';

export class UpdateMenuItemDto {
  @ApiProperty({
    example: '6691ab2d5cf2a13ba0d7d8c1',
    description: 'ID danh mục món ăn (Category ID)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'ID danh mục không đúng định dạng ObjectId' })
  categoryId?: string;

  @ApiProperty({
    example: 'Cơm tấm sườn bì chả đặc biệt',
    description: 'Tên món ăn',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Tên món ăn phải là chuỗi ký tự' })
  name?: string;

  @ApiProperty({
    example: 'Ngon tuyệt hảo',
    description: 'Mô tả món ăn',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;

  @ApiProperty({
    example: 40000,
    description: 'Giá bán của món ăn',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Giá món ăn phải là số nguyên VND' })
  @Min(0, { message: 'Giá món ăn phải lớn hơn hoặc bằng 0' })
  @Max(Number.MAX_SAFE_INTEGER, { message: 'Giá món ăn vượt giới hạn hỗ trợ' })
  price?: number;

  @ApiProperty({
    example: 'http://image-url-here.png',
    description: 'Đường dẫn hình ảnh món ăn',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Đường dẫn ảnh phải là chuỗi ký tự' })
  imageUrl?: string;

  @ApiProperty({
    example: true,
    description: 'Món ăn có sẵn hay không',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái có sẵn phải là kiểu boolean' })
  isAvailable?: boolean;

  @ApiProperty({
    type: [MenuItemOptionDto],
    description: 'Danh sách tùy chọn kèm theo',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách tùy chọn phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => MenuItemOptionDto)
  options?: MenuItemOptionDto[];
}
