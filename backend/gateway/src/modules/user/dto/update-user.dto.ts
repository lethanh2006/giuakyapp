import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'New Username',
    description: 'Tên hiển thị mới của người dùng',
  })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  username: string;
}
