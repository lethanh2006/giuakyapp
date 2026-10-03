import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class UpdateRoleDto {
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string'
      ? rawValue.trim().toLowerCase()
      : rawValue;
  })
  @IsEnum(UserRole, { message: 'role must be admin or user.' })
  role!: string;
}
