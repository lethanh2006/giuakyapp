import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateNameDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;
}
