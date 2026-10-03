import { Injectable, NestMiddleware } from '@nestjs/common';
import {
  DEFAULT_CODE_BY_STATUS,
  normalizeRouteTemplate,
} from '@nrapp/observability';
import type { NextFunction, Response } from 'express';
import type {
  GatewayRequestOutcome,
  RequestWithContext,
} from '../interfaces/request-context.interface';
import { StructuredLoggerService } from '../logging/logger';
import { performance } from 'node:perf_hooks';

function notFoundSampleRate(): number {
  const configured = Number(process.env.LOG_HTTP_404_SAMPLE_RATE);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1;
}

export function setRequestOutcome(
  request: RequestWithContext,
  outcome: GatewayRequestOutcome,
): void {
  if (request.requestContext) {
    request.requestContext.outcome = outcome;
  }
}

export function requestRouteTemplate(request: RequestWithContext): string {
  const routePath = request.route?.path;
  if (typeof routePath !== 'string' || !routePath.trim()) {
    return 'unmatched';
  }

  const baseUrl = request.baseUrl === '/' ? '' : request.baseUrl || '';
  return normalizeRouteTemplate(`${baseUrl}${routePath}`);
}

@Injectable()
export class RequestOutcomeMiddleware implements NestMiddleware {
  constructor(private readonly logger: StructuredLoggerService) {}

  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const logMinMs = Number(process.env.PERF_LOG_MIN_MS || 0);
    const started = logMinMs > 0 ? performance.now() : 0;
    response.once('finish', () => {
      this.recordRejection(request, response);
      if (started && performance.now() - started >= logMinMs) {
        this.recordTiming(request, response, performance.now() - started);
      }
    });
    next();
  }

  private recordTiming(
    request: RequestWithContext,
    response: Response,
    totalMs: number,
  ): void {
    const authMs = request.requestContext?.perf?.authMs ?? 0;
    const upstreamMs = request.requestContext?.perf?.upstreamMs ?? 0;
    this.logger.info('http.request.perf', {
      request_id: request.requestContext?.requestId ?? 'unknown',
      'http.request.method': request.method,
      'http.route': requestRouteTemplate(request),
      'http.response.status_code': response.statusCode,
      total_ms: Math.round(totalMs * 100) / 100,
      auth_ms: Math.round(authMs * 100) / 100,
      upstream_ms: Math.round(upstreamMs * 100) / 100,
      other_ms: Math.max(
        0,
        Math.round((totalMs - authMs - upstreamMs) * 100) / 100,
      ),
    });
  }

  private recordRejection(
    request: RequestWithContext,
    response: Response,
  ): void {
    const statusCode = response.statusCode;
    if (statusCode < 400 || statusCode >= 500) {
      return;
    }

    const outcome = request.requestContext?.outcome;
    const route = requestRouteTemplate(request);
    const errorCode =
      outcome?.code ??
      DEFAULT_CODE_BY_STATUS[statusCode] ??
      `HTTP_${statusCode}`;

    if (statusCode === 404 && Math.random() > notFoundSampleRate()) {
      return;
    }

    const details = {
      request_id: request.requestContext?.requestId ?? 'unknown',
      'http.request.method': request.method,
      'http.route': route,
      'http.response.status_code': statusCode,
      'error.code': errorCode,
      ...(outcome?.validationFields?.length
        ? { 'validation.fields': outcome.validationFields }
        : {}),
      ...(outcome?.originService
        ? { 'server.address': outcome.originService }
        : {}),
    };

    if (statusCode === 403 || statusCode === 429) {
      this.logger.warn(
        'http.request.rejected',
        details,
        'HTTP request rejected at Gateway',
      );
      return;
    }

    this.logger.info(
      'http.request.rejected',
      details,
      'HTTP request rejected at Gateway',
    );
  }
}
