import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateTaskDeadlineDto {
  @ApiProperty({
    description: 'Hạn chót công việc định dạng ISO 8601',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsNotEmpty({ message: 'deadline không được để trống' })
  @IsDateString({}, { message: 'deadline phải là định dạng ISO 8601 hợp lệ' })
  deadline!: string;
}
