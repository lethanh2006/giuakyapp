import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export class AssignTaskDto {
  @ApiProperty({
    example: 'userId456',
    description: 'ID của người dùng được giao việc',
  })
  @IsNotEmpty({ message: 'assignedTo không được để trống' })
  @IsMongoId({ message: 'assignedTo phải là MongoDB ObjectId hợp lệ' })
  assignedTo: string;
}
export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.DONE,
    description: 'Trạng thái mới của công việc',
  })
  @IsNotEmpty({ message: 'status không được để trống' })
  @IsEnum(TaskStatus, {
    message: 'status phải là todo, in_progress, done hoặc cancelled',
  })
  status: TaskStatus;
}
