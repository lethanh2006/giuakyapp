import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
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

export class MenuItemOptionDto {
  @ApiProperty({ example: 'Thêm trân châu', description: 'Tên tùy chọn thêm' })
  @IsNotEmpty({ message: 'Tên tùy chọn không được để trống' })
  @IsString({ message: 'Tên tùy chọn phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({ example: 5000, description: 'Giá của tùy chọn thêm' })
  @IsNotEmpty({ message: 'Giá tùy chọn không được để trống' })
  @IsInt({ message: 'Giá tùy chọn phải là số nguyên VND' })
  @Min(0, { message: 'Giá tùy chọn phải lớn hơn hoặc bằng 0' })
  @Max(Number.MAX_SAFE_INTEGER, {
    message: 'Giá tùy chọn vượt giới hạn hỗ trợ',
  })
  price: number;
}

export class CreateMenuItemDto {
  @ApiProperty({
    example: '6691ab2d5cf2a13ba0d7d8c1',
    description: 'ID danh mục món ăn (Category ID)',
  })
  @IsNotEmpty({ message: 'Danh mục (categoryId) không được để trống' })
  @IsMongoId({ message: 'ID danh mục không đúng định dạng ObjectId' })
  categoryId: string;

  @ApiProperty({ example: 'Cơm tấm sườn bì chả', description: 'Tên món ăn' })
  @IsNotEmpty({ message: 'Tên món ăn không được để trống' })
  @IsString({ message: 'Tên món ăn phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({
    example: 'Cơm tấm sườn nướng mật ong thơm ngon',
    description: 'Mô tả món ăn',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;

  @ApiProperty({ example: 35000, description: 'Giá bán của món ăn' })
  @IsNotEmpty({ message: 'Giá món ăn không được để trống' })
  @IsInt({ message: 'Giá món ăn phải là số nguyên VND' })
  @Min(0, { message: 'Giá món ăn phải lớn hơn hoặc bằng 0' })
  @Max(Number.MAX_SAFE_INTEGER, { message: 'Giá món ăn vượt giới hạn hỗ trợ' })
  price: number;

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
