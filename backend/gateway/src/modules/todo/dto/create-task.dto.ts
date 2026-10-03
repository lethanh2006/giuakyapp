import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class CreateTaskDto {
  @ApiProperty({
    example: 'Báo cáo doanh thu',
    description: 'Tiêu đề của công việc cần làm',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Hoàn thành báo cáo quý trước thứ Sáu',
    description: 'Mô tả chi tiết về công việc',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 'high',
    description: 'Mức độ ưu tiên (low, medium, high)',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'priority phải là low, medium hoặc high' })
  priority?: TaskPriority;

  @ApiProperty({
    example: '2026-07-20T17:00:00.000Z',
    description: 'Thời hạn hoàn thành công việc',
    required: false,
  })
  @IsOptional()
  @IsISO8601({}, { message: 'deadline phải là thời gian ISO 8601 hợp lệ' })
  deadline?: string;

  @ApiProperty({
    example: 'userId456',
    description: 'ID của người dùng được phân công việc',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'assignedTo phải là MongoDB ObjectId hợp lệ' })
  assignedTo?: string;
}
