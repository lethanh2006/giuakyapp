import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskStatus } from './assign-task.dto';
import { TaskPriority } from './create-task.dto';

export class MyTaskQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus, {
    message: 'status phải là todo, in_progress, done hoặc cancelled',
  })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'priority phải là low, medium hoặc high',
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Tìm trong tiêu đề và mô tả',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'search không được dài quá 100 ký tự' })
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được lớn hơn 100' })
  limit = 20;
}

export class TaskQueryDto extends MyTaskQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo người được giao' })
  @IsOptional()
  @IsMongoId({ message: 'assignedTo phải là MongoDB ObjectId hợp lệ' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Lọc theo người tạo' })
  @IsOptional()
  @IsMongoId({ message: 'createdBy phải là MongoDB ObjectId hợp lệ' })
  createdBy?: string;
}
