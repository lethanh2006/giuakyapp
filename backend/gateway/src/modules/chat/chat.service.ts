import { Inject, Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';

export interface UploadedChatImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface ProxiedChatResponse {
  statusCode: number;
  body: unknown;
}

@Injectable({ scope: Scope.REQUEST })
export class ChatService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
    private readonly signatureService: InternalRequestSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'CHAT_SERVICE_URL',
      'http://localhost:5002',
    );
  }

  private createUserHeaders(method: string, path: string, user?: any) {
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
          'chat',
          `${method.toUpperCase()}:${path}`,
        ),
      );
    }
    return headers;
  }

  private async forward(
    method: string,
    path: string,
    data?: any,
    params?: any,
    user?: any,
    preserveStatus = false,
  ) {
    const started = performance.now();
    try {
      const response = await this.httpService.axiosRef.request({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        params,
        headers: this.createUserHeaders(method, path, user),
      });
      if (preserveStatus) {
        return {
          statusCode: response.status,
          body: response.data,
        };
      }
      return response.data;
    } catch (error: unknown) {
      throwUpstreamError(error, 'Dịch vụ trò chuyện');
    } finally {
      if (this.request.requestContext) {
        (this.request.requestContext.perf ??= {}).upstreamMs =
          performance.now() - started;
      }
    }
  }

  async createChat(dto: any, user: any): Promise<ProxiedChatResponse> {
    return this.forward('POST', '/api/chat/chat/new', dto, null, user, true);
  }

  async getAllChats(user: any) {
    return this.forward('GET', '/api/chat/chat/all', null, null, user);
  }

  async sendMessage(dto: any, image: UploadedChatImage | undefined, user: any) {
    if (!image) {
      return this.forward('POST', '/api/chat/message', dto, null, user);
    }

    const form = new FormData();
    form.append('chatId', dto.chatId);
    if (dto.text) form.append('text', dto.text);
    form.append('image', image.buffer, {
      filename: image.originalname || 'chat-image.jpg',
      contentType: image.mimetype || 'image/jpeg',
      knownLength: image.buffer.length,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/chat/message`, form, {
          headers: {
            ...form.getHeaders(),
            ...this.createUserHeaders('POST', '/api/chat/message', user),
          },
          maxBodyLength: 6 * 1024 * 1024,
          maxContentLength: 6 * 1024 * 1024,
          timeout: 55_000,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      throwUpstreamError(error, 'Dịch vụ trò chuyện');
    }
  }

  async getMessages(chatId: string, user: any) {
    return this.forward(
      'GET',
      `/api/chat/message/${encodeURIComponent(chatId)}`,
      null,
      null,
      user,
    );
  }
}
