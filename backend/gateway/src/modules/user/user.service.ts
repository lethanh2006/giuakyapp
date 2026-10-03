import { Inject, Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
    private readonly signatureService: InternalRequestSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:5000',
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
          'user',
          `${method.toUpperCase()}:${path}`,
        ),
      );
    }

    const started = performance.now();
    try {
      const response = await this.httpService.axiosRef.request({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        params,
        headers,
      });
      return response.data;
    } catch (error: unknown) {
      throwUpstreamError(error, 'Dịch vụ người dùng');
    } finally {
      if (this.request.requestContext) {
        (this.request.requestContext.perf ??= {}).upstreamMs =
          performance.now() - started;
      }
    }
  }

  async getMyProfile(user: any) {
    return this.forward('GET', '/api/user/me', null, null, user);
  }

  async getPublicProfile(userId: string, user: any) {
    return this.forward('GET', `/api/user/user/${userId}`, null, null, user);
  }

  async getFullProfileByAdmin(userId: string, user: any) {
    return this.forward(
      'GET',
      `/api/user/internal/admin/${encodeURIComponent(userId)}`,
      null,
      null,
      user,
    );
  }

  async getAllUsers(user: any) {
    return this.forward('GET', '/api/user/user/all', null, null, user);
  }

  async updateUser(dto: any, user: any) {
    return this.forward('POST', '/api/user/update/user', dto, null, user);
  }
}
