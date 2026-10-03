import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InternalRequestSignatureService } from '../../common/security/internal-request-signature.service';
import type { RequestWithContext } from '../../common/interfaces/request-context.interface';
import { throwUpstreamError } from '../../common/http/upstream-error';
import { randomUUID } from 'crypto';

@Injectable({ scope: Scope.REQUEST })
export class CanteenService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly signatureService: InternalRequestSignatureService,
    @Inject(REQUEST) private readonly request: RequestWithContext,
  ) {
    this.baseUrl = this.configService.get<string>(
      'CANTEEN_SERVICE_URL',
      'http://localhost:5005',
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
        this.signatureService.signUserPayload(base64User, requestId),
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
      throwUpstreamError(error, 'Dịch vụ căn tin');
    }
  }

  // --- Menu APIs ---
  async getMenu() {
    return this.forward('GET', '/api/canteen/menu');
  }

  async searchMenu(query: string) {
    const params = query ? { q: query } : undefined;
    return this.forward('GET', '/api/canteen/menu/search', null, params);
  }

  async getAdminMenu(user: any) {
    return this.forward('GET', '/api/canteen/admin/menu', null, null, user);
  }

  async createMenuItem(dto: any, user: any) {
    return this.forward('POST', '/api/canteen/admin/menu', dto, null, user);
  }

  async updateMenuItem(id: string, dto: any, user: any) {
    return this.forward(
      'PUT',
      `/api/canteen/admin/menu/${id}`,
      dto,
      null,
      user,
    );
  }

  async deleteMenuItem(id: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/canteen/admin/menu/${id}`,
      null,
      null,
      user,
    );
  }

  async undoMenuItemChange(user: any) {
    return this.forward(
      'POST',
      '/api/canteen/admin/menu/undo',
      null,
      null,
      user,
    );
  }

  async redoMenuItemChange(user: any) {
    return this.forward(
      'POST',
      '/api/canteen/admin/menu/redo',
      null,
      null,
      user,
    );
  }

  // --- Order APIs ---
  async createOrder(dto: any, user: any) {
    return this.forward('POST', '/api/canteen/orders', dto, null, user);
  }

  async getOrders(params: any, user: any) {
    return this.forward('GET', '/api/canteen/orders', null, params, user);
  }

  async getMyOrders(user: any) {
    return this.forward(
      'GET',
      '/api/canteen/orders/my-orders',
      null,
      null,
      user,
    );
  }

  async getOrderById(id: string, user: any) {
    return this.forward('GET', `/api/canteen/orders/${id}`, null, null, user);
  }

  async cancelOrder(id: string, dto: any, user: any) {
    return this.forward(
      'PATCH',
      `/api/canteen/orders/${encodeURIComponent(id)}/cancel`,
      dto,
      null,
      user,
    );
  }

  async confirmCashPayment(id: string, user: any) {
    return this.forward(
      'PATCH',
      `/api/canteen/orders/${id}/payment/cash`,
      null,
      null,
      user,
    );
  }

  // --- Table APIs ---
  async getAllTables(params: any, user: any) {
    return this.forward('GET', '/api/canteen/tables', null, params, user);
  }

  async getTableById(id: string, user: any) {
    return this.forward('GET', `/api/canteen/tables/${id}`, null, null, user);
  }

  async createTable(dto: any, user: any) {
    return this.forward('POST', '/api/canteen/tables', dto, null, user);
  }

  async updateTable(id: string, dto: any, user: any) {
    return this.forward('PATCH', `/api/canteen/tables/${id}`, dto, null, user);
  }

  async deleteTable(id: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/canteen/tables/${id}`,
      null,
      null,
      user,
    );
  }

  async updateTableStatus(id: string, dto: any, user: any) {
    return this.forward(
      'PATCH',
      `/api/canteen/tables/${id}/status`,
      dto,
      null,
      user,
    );
  }

  // --- Category APIs ---
  async getCategories(params: any) {
    return this.forward('GET', '/api/canteen/categories', null, params);
  }

  async getCategoryById(id: string) {
    return this.forward('GET', `/api/canteen/categories/${id}`);
  }

  async createCategory(dto: any, user: any) {
    return this.forward('POST', '/api/canteen/categories', dto, null, user);
  }

  async updateCategory(id: string, dto: any, user: any) {
    return this.forward(
      'PATCH',
      `/api/canteen/categories/${id}`,
      dto,
      null,
      user,
    );
  }

  async deleteCategory(id: string, user: any) {
    return this.forward(
      'DELETE',
      `/api/canteen/categories/${id}`,
      null,
      null,
      user,
    );
  }
}
