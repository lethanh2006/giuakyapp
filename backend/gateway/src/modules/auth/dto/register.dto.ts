import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu đăng nhập (ít nhất 6 ký tự)',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    example: 'username123',
    description: 'Tên tài khoản người dùng',
  })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  username: string;
}
