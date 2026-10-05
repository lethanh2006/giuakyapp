import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpcomingDeadlineQueryDto {
  @ApiPropertyOptional({
    description: 'Số ngày sắp tới để lọc hạn chót (mặc định 3)',
    default: 3,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days phải là số nguyên' })
  @Min(1, { message: 'days tối thiểu là 1' })
  @Max(30, { message: 'days tối đa là 30' })
  days = 3;
}
