import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đã đăng nhập/đăng ký',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP (gồm 6 chữ số)',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký số' })
  otp: string;
}
