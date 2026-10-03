import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đăng nhập',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
