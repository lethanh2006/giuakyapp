import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TaskPriority } from './create-task.dto';

export class UpdateTaskPriorityDto {
  @ApiProperty({
    example: 'urgent',
    description: 'Mức độ ưu tiên mới của công việc (low, medium, high, urgent)',
    enum: TaskPriority,
  })
  @IsNotEmpty({ message: 'priority không được để trống' })
  @IsEnum(TaskPriority, {
    message: 'priority phải là low, medium, high hoặc urgent',
  })
  priority: TaskPriority;
}
