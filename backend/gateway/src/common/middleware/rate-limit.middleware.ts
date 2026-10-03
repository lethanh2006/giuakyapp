import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from '../interfaces/request-context.interface';
import { setRequestOutcome } from './request-outcome.middleware';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Rate limit cơ bản cho một Gateway instance.
 * Khi scale nhiều instance, thay Map bằng Redis hoặc rate limit tại ingress.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(configService: ConfigService) {
    const configuredWindowMs = Number(
      configService.get<string>('RATE_LIMIT_WINDOW_MS') ?? 60_000,
    );
    const configuredMaxRequests = Number(
      configService.get<string>('RATE_LIMIT_MAX_REQUESTS') ?? 120,
    );
    this.windowMs =
      Number.isFinite(configuredWindowMs) && configuredWindowMs > 0
        ? configuredWindowMs
        : 60_000;
    this.maxRequests =
      Number.isInteger(configuredMaxRequests) && configuredMaxRequests > 0
        ? configuredMaxRequests
        : 120;
  }

  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    let bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, this.maxRequests - bucket.count);
    response.setHeader('x-ratelimit-limit', this.maxRequests);
    response.setHeader('x-ratelimit-remaining', remaining);
    response.setHeader('x-ratelimit-reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > this.maxRequests) {
      setRequestOutcome(request, { code: 'RATE_LIMITED' });
      response.setHeader(
        'retry-after',
        Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      );
      response.status(429).json({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Quá nhiều request, vui lòng thử lại sau',
        requestId: request.requestContext?.requestId,
      });
      return;
    }

    if (this.buckets.size > 10_000) {
      this.removeExpiredBuckets(now);
    }
    next();
  }

  private removeExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
