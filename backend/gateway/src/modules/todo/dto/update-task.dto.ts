import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TaskPriority } from './create-task.dto';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Báo cáo doanh thu đã điều chỉnh' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'title phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 'Hoàn thành trước cuộc họp tuần',
    nullable: true,
    description: 'Truyền null để xoá mô tả',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString({ message: 'description phải là chuỗi ký tự hoặc null' })
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: TaskPriority })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(TaskPriority, {
    message: 'priority phải là low, medium hoặc high',
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '2026-07-20T17:00:00.000Z',
    nullable: true,
    description: 'Truyền null để xoá thời hạn',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsISO8601({}, { message: 'deadline phải là thời gian ISO 8601 hoặc null' })
  deadline?: string | null;
}
