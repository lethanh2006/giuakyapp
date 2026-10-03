import { Inject, Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'node:crypto';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
    private readonly signatureService: InternalRequestSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:4000',
    );
  }

  private async forward(
    method: string,
    path: string,
    data?: any,
    params?: any,
    user?: any,
  ) {
    const requestId = this.request.requestContext?.requestId ?? randomUUID();
    const headers: Record<string, string> = {
      'x-request-id': requestId,
    };
    if (user) {
      const userPayloadStr = JSON.stringify(user);
      const base64User = Buffer.from(userPayloadStr).toString('base64');
      Object.assign(
        headers,
        this.signatureService.signUserPayload(
          base64User,
          requestId,
          'auth',
          `${method.toUpperCase()}:${path}`,
        ),
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: `${this.baseUrl}${path}`,
          data,
          params,
          headers,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      throwUpstreamError(error, 'Dịch vụ xác thực');
    }
  }

  async register(dto: any) {
    return this.forward('POST', '/api/auth/register', dto);
  }

  async login(dto: any) {
    return this.forward('POST', '/api/auth/login', dto);
  }

  async verifyOtp(dto: any) {
    return this.forward('POST', '/api/auth/verify', dto);
  }

  async refresh(dto: any) {
    return this.forward('POST', '/api/auth/refresh', dto);
  }

  async loginWithGoogle(dto: any) {
    return this.forward('POST', '/api/auth/login-google', dto);
  }

  async getMyProfile(user: any) {
    return this.forward('GET', '/api/auth/me', null, null, user);
  }

  async updateMyEmail(dto: any, user: any) {
    return this.forward('PATCH', '/api/auth/me/email', dto, null, user);
  }

  async deleteMyAccount(user: any) {
    return this.forward('DELETE', '/api/auth/me', null, null, user);
  }

  async getUserProfileByAdmin(userId: string, user: any) {
    return this.forward('GET', `/api/auth/users/${userId}`, null, null, user);
  }

  async deleteUserByAdmin(userId: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/auth/users/${userId}`,
      null,
      null,
      user,
    );
  }

  async updateUserRole(userId: string, role: string, user: any) {
    return this.forward(
      'PATCH',
      `/api/auth/users/${userId}/role`,
      { role },
      null,
      user,
    );
  }
}
