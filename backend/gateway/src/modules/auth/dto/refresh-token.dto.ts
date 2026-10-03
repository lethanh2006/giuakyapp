import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token do Auth Service cấp' })
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  @IsJWT({ message: 'Refresh token không đúng định dạng JWT' })
  refreshToken: string;
}
