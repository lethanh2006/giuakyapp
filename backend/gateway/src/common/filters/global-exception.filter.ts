import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  classifyException,
  createErrorId,
  handleOriginHttpException,
} from '@nrapp/observability';
import type { ValidationError } from 'class-validator';
import { StructuredLoggerService } from '../logging/logger';
import type { RequestWithContext } from '../interfaces/request-context.interface';
import {
  requestRouteTemplate,
  setRequestOutcome,
} from '../middleware/request-outcome.middleware';
import { UpstreamHttpException } from '../http/upstream-error';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: StructuredLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<RequestWithContext>();
    const requestId = request.requestContext?.requestId ?? 'unknown';
    const route = requestRouteTemplate(request);
    const context = {
      requestId,
      method: request.method,
      route,
    };
    const classification = classifyException(exception);

    if (
      exception instanceof UpstreamHttpException &&
      !classification.expected
    ) {
      const errorId = exception.errorId ?? createErrorId();
      this.logger.warn(
        'http.upstream.failed',
        {
          request_id: requestId,
          'http.request.method': request.method,
          'http.route': route,
          'http.response.status_code': classification.statusCode,
          'error.code': classification.code,
          'error.id': errorId,
          'server.address': exception.originService,
        },
        'Upstream service returned an unexpected error',
      );

      httpAdapter.reply(
        httpContext.getResponse(),
        {
          statusCode: classification.statusCode,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId,
          errorId,
        },
        classification.statusCode,
      );
      return;
    }

    const result = handleOriginHttpException(
      this.logger.raw,
      exception,
      context,
    );

    if (result.classification.expected) {
      if (result.statusCode === 404) {
        result.body.message = 'Không tìm thấy tài nguyên';
      }
      const responseCode = String(
        result.body.code ?? result.classification.code,
      );
      const fields =
        typeof result.body.details === 'object' &&
        result.body.details !== null &&
        !Array.isArray(result.body.details) &&
        Array.isArray((result.body.details as Record<string, unknown>).fields)
          ? ((result.body.details as Record<string, unknown>)
              .fields as string[])
          : undefined;

      setRequestOutcome(request, {
        code: responseCode,
        ...(fields?.length ? { validationFields: fields } : {}),
        ...(exception instanceof UpstreamHttpException
          ? { originService: exception.originService }
          : {}),
      });
    }

    httpAdapter.reply(
      httpContext.getResponse(),
      result.body,
      result.statusCode,
    );
  }
}

function collectFieldPaths(errors: ValidationError[], prefix = ''): string[] {
  const fields: string[] = [];

  for (const error of errors) {
    const property = String(error.property ?? '').trim();
    if (!property || !/^[A-Za-z0-9_[\]-]{1,100}$/.test(property)) {
      continue;
    }

    const path = prefix ? `${prefix}.${property}` : property;
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      fields.push(path);
    }
    if (error.children?.length) {
      fields.push(...collectFieldPaths(error.children, path));
    }
  }

  return fields;
}

export function createValidationException(
  errors: ValidationError[],
): UnprocessableEntityException {
  const fields = [...new Set(collectFieldPaths(errors))].slice(0, 50);

  return new UnprocessableEntityException({
    statusCode: 422,
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu không hợp lệ',
    details: { fields },
  });
}
