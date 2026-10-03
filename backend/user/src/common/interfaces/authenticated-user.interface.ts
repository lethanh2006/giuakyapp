import type { Request } from 'express';

/** Payload đã được Gateway xác thực rồi chuyển tiếp bằng x-user-payload. */
export interface AuthenticatedUser {
  _id: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface RequestWithAuthenticatedUser extends Request {
  user?: AuthenticatedUser;
}
