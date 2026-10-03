import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    example: 'new-email@example.com',
    description: 'Địa chỉ email mới cần cập nhật',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;
}
export class LoginGoogleDto {
  @ApiProperty({
    example: 'google-oauth-token-string',
    description: 'OAuth2 token nhận từ Google',
  })
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;
}
