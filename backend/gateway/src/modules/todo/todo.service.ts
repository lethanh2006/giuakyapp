import { Inject, Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';
import type { MyTaskQueryDto, TaskQueryDto } from './dto/task-query.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

@Injectable({ scope: Scope.REQUEST })
export class TodoService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
    private readonly signatureService: InternalRequestSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'TODO_SERVICE_URL',
      'http://localhost:5003',
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
          'todo',
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
      throwUpstreamError(error, 'Dịch vụ công việc');
    } finally {
      if (this.request.requestContext) {
        (this.request.requestContext.perf ??= {}).upstreamMs =
          performance.now() - started;
      }
    }
  }

  async getMyTasks(query: MyTaskQueryDto, user: any) {
    return this.forward('GET', '/api/todo/my-tasks', null, query, user);
  }

  async updateTaskStatus(id: string, status: string, user: any) {
    return this.forward(
      'PATCH',
      `/api/todo/${encodeURIComponent(id)}/status`,
      { status },
      null,
      user,
    );
  }

  async createTask(dto: any, user: any) {
    return this.forward('POST', '/api/todo', dto, null, user);
  }

  async assignTask(id: string, assignedTo: string, user: any) {
    return this.forward(
      'PATCH',
      `/api/todo/${encodeURIComponent(id)}/assign`,
      { assignedTo },
      null,
      user,
    );
  }

  async updateTask(id: string, dto: UpdateTaskDto, user: any) {
    return this.forward(
      'PATCH',
      `/api/todo/${encodeURIComponent(id)}`,
      dto,
      null,
      user,
    );
  }

  async getAllTasks(query: TaskQueryDto, user: any) {
    return this.forward('GET', '/api/todo', null, query, user);
  }

  async getTaskById(id: string, user: any) {
    return this.forward(
      'GET',
      `/api/todo/${encodeURIComponent(id)}`,
      null,
      null,
      user,
    );
  }

  async deleteTask(id: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/todo/${encodeURIComponent(id)}`,
      null,
      null,
      user,
    );
  }
}
