import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateTableStatusDto {
  @ApiProperty({
    description: 'Trạng thái bàn ăn',
    enum: ['empty', 'occupied', 'reserved'],
    example: 'occupied',
  })
  @IsString()
  @IsIn(['empty', 'occupied', 'reserved'])
  status: 'empty' | 'occupied' | 'reserved';
}
