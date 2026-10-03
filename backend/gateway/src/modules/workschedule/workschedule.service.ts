import { Inject, Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { firstValueFrom } from 'rxjs';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'node:crypto';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';

@Injectable({ scope: Scope.REQUEST })
export class WorkscheduleService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
    private readonly signatureService: InternalRequestSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'WORKSCHEDULE_SERVICE_URL',
      'http://localhost:5004',
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
          'workschedule',
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
      throwUpstreamError(error, 'Dịch vụ lịch làm việc');
    }
  }

  async getPendingRequests(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/schedule/pending',
      null,
      query,
      user,
    );
  }

  async getAllRequests(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/schedule/all',
      null,
      query,
      user,
    );
  }

  async approveRequest(id: string, user: any) {
    return this.forward(
      'POST',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}/approve`,
      null,
      null,
      user,
    );
  }

  async rejectRequest(id: string, dto: any, user: any) {
    return this.forward(
      'POST',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}/reject`,
      dto,
      null,
      user,
    );
  }

  async bulkApprove(dto: any, user: any) {
    return this.forward(
      'POST',
      '/api/workschedule/schedule/requests/bulk-approve',
      dto,
      null,
      user,
    );
  }

  async getHeatmap(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/schedule/heatmap',
      null,
      query,
      user,
    );
  }

  async scanAttendance(dto: any, user: any) {
    return this.forward(
      'POST',
      '/api/workschedule/attendance/scan',
      dto,
      null,
      user,
    );
  }

  async getMyAttendance(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/attendance/my',
      null,
      query,
      user,
    );
  }

  async generateQrToken(user: any) {
    return this.forward(
      'POST',
      '/api/workschedule/attendance/qr/generate',
      null,
      null,
      user,
    );
  }

  async getTodayAttendance(user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/attendance/today',
      null,
      null,
      user,
    );
  }

  async getReport(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/attendance/report',
      null,
      query,
      user,
    );
  }

  async getPolicy() {
    return this.forward('GET', '/api/workschedule/policy');
  }

  async updatePolicy(dto: any, user: any) {
    return this.forward('PATCH', '/api/workschedule/policy', dto, null, user);
  }

  async getMySchedules(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/schedule/my',
      null,
      query,
      user,
    );
  }

  async getMonthlyOverview(month: string, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/schedule/monthly-overview',
      null,
      { month },
      user,
    );
  }

  async createRequest(dto: any, user: any) {
    return this.forward(
      'POST',
      '/api/workschedule/schedule/requests',
      dto,
      null,
      user,
    );
  }

  async resubmitRequest(id: string, dto: any, user: any) {
    return this.forward(
      'POST',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}/resubmit`,
      dto,
      null,
      user,
    );
  }

  async getRequestInfo(id: string, user: any) {
    return this.forward(
      'GET',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}`,
      null,
      null,
      user,
    );
  }

  async updateEntries(id: string, dto: any, user: any) {
    return this.forward(
      'PATCH',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}`,
      dto,
      null,
      user,
    );
  }

  async deleteRequest(id: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/workschedule/schedule/requests/${encodeURIComponent(id)}`,
      null,
      null,
      user,
    );
  }

  async getMyWorkRequestStats(month: string, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/requests/my/stats',
      null,
      month ? { month } : undefined,
      user,
    );
  }

  async getMyWorkRequests(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/requests/my',
      null,
      query,
      user,
    );
  }

  async createWorkRequest(dto: any, user: any) {
    return this.forward('POST', '/api/workschedule/requests', dto, null, user);
  }

  async cancelWorkRequest(id: string, user: any) {
    return this.forward(
      'PATCH',
      `/api/workschedule/requests/${encodeURIComponent(id)}/cancel`,
      null,
      null,
      user,
    );
  }

  async getAdminWorkRequests(query: Record<string, string>, user: any) {
    return this.forward(
      'GET',
      '/api/workschedule/requests/admin',
      null,
      query,
      user,
    );
  }

  async approveWorkRequest(id: string, user: any) {
    return this.forward(
      'POST',
      `/api/workschedule/requests/${encodeURIComponent(id)}/approve`,
      null,
      null,
      user,
    );
  }

  async rejectWorkRequest(id: string, dto: any, user: any) {
    return this.forward(
      'POST',
      `/api/workschedule/requests/${encodeURIComponent(id)}/reject`,
      dto,
      null,
      user,
    );
  }
}
