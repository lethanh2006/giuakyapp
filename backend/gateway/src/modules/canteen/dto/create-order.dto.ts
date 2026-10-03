import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderSelectedOptionDto {
  @ApiProperty({ example: 'Trứng opla', description: 'Tên tùy chọn kèm theo' })
  @IsNotEmpty({ message: 'Tên tùy chọn không được để trống' })
  @IsString({ message: 'Tên tùy chọn phải là chuỗi ký tự' })
  name: string;
}

export class CreateOrderItemDto {
  @ApiProperty({
    example: '6691ab2d5cf2a13ba0d7d8c5',
    description: 'ID món ăn (menuItemId)',
  })
  @IsNotEmpty({ message: 'ID món ăn (menuItemId) không được để trống' })
  @IsMongoId({ message: 'ID món ăn không đúng định dạng ObjectId' })
  menuItemId: string;

  @ApiProperty({ example: 2, description: 'Số lượng đặt mua' })
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  @Max(Number.MAX_SAFE_INTEGER, { message: 'Số lượng vượt giới hạn hỗ trợ' })
  quantity: number;

  @ApiPropertyOptional({
    type: [OrderSelectedOptionDto],
    description: 'Danh sách tùy chọn chọn thêm',
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách tùy chọn phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => OrderSelectedOptionDto)
  selectedOptions?: OrderSelectedOptionDto[];

  @ApiPropertyOptional({
    example: 'Ít cay, không lấy rau thơm',
    description: 'Ghi chú cho món ăn',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  note?: string;
}

export enum OrderPaymentMethod {
  CASH = 'CASH',
}

export class CreateOrderDto {
  @ApiProperty({
    example: '6691ab2d5cf2a13ba0d7d810',
    description: 'ID bàn ăn; nhân viên phải chọn bàn trước khi gọi món',
  })
  @IsMongoId({ message: 'ID bàn ăn không đúng định dạng ObjectId' })
  tableId: string;

  @ApiProperty({
    type: [CreateOrderItemDto],
    minItems: 1,
    description: 'Danh sách món của đơn hàng; cần ít nhất một món',
  })
  @IsNotEmpty({ message: 'Danh sách món ăn (items) không được để trống' })
  @IsArray({ message: 'Danh sách món ăn phải là mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất một món ăn' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    example: 'CASH',
    enum: OrderPaymentMethod,
    description: 'Phương thức thanh toán',
    default: 'CASH',
  })
  @IsOptional()
  @IsEnum(OrderPaymentMethod, {
    message: 'Phương thức thanh toán không hợp lệ',
  })
  paymentMethod?: OrderPaymentMethod;
}
