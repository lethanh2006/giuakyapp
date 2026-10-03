import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ description: 'Tên bàn ăn (ví dụ: Bàn 01)', example: 'Bàn 01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Sức chứa tối đa (số người)', example: 4 })
  @IsNumber()
  @Min(1)
  capacity: number;
}
