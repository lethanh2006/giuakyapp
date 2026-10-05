import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateTaskProgressDto {
  @ApiProperty({
    description: 'Tiến độ hoàn thành của công việc (0 - 100%)',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt({ message: 'progress phải là số nguyên' })
  @Min(0, { message: 'progress tối thiểu là 0' })
  @Max(100, { message: 'progress tối đa là 100' })
  progress!: number;
}
