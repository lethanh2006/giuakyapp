import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no static decorator roles are defined, default allow for all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Bạn chưa đăng nhập',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const hasRole = requiredRoles.some(
      (role) =>
        user.role?.toString().toUpperCase() === role.toString().toUpperCase(),
    );

    if (!hasRole) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: `Bạn không có quyền. Yêu cầu: ${requiredRoles.join(', ')}`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
