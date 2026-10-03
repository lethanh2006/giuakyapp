import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { RequestWithAuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { parseAuthenticatedUser } from '../utils/authenticated-user.util';

@Injectable()
export class UserPayloadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthenticatedUser>();
    const payload = request.headers['x-user-payload'];

    if (typeof payload !== 'string') {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      const user = parseAuthenticatedUser(JSON.parse(decoded) as unknown);
      if (!user) throw new Error('Invalid user payload');
      request.user = user;
      return true;
    } catch {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
