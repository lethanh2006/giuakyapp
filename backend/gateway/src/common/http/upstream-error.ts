import { BadGatewayException, HttpException } from '@nestjs/common';
import {
  DEFAULT_CODE_BY_STATUS,
  sanitizeText,
  validationFieldsFromMessages,
} from '@nrapp/observability';
import { isAxiosError } from 'axios';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeCode(value: unknown, status: number): string {
  const fallback = DEFAULT_CODE_BY_STATUS[status] ?? `HTTP_${status}`;
  if (typeof value !== 'string') return fallback;

  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .toUpperCase()
    .slice(0, 100);
  return normalized || fallback;
}

function safeFields(data: Record<string, unknown>): string[] {
  const explicitFields = isRecord(data.details)
    ? data.details.fields
    : undefined;
  const values = Array.isArray(explicitFields)
    ? explicitFields
    : validationFieldsFromMessages(data.message);

  return [
    ...new Set(
      values
        .filter((field): field is string => typeof field === 'string')
        .map((field) => field.trim())
        .filter((field) => /^[A-Za-z0-9_.[\]-]{1,100}$/.test(field)),
    ),
  ].slice(0, 50);
}

function safeErrorId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : undefined;
}

export function createUpstreamErrorPayload(
  data: unknown,
  status: number,
  serviceName: string,
): Record<string, unknown> {
  if (isRecord(data)) {
    const fields = safeFields(data);
    const validation = fields.length > 0;
    const message =
      status >= 500
        ? 'Internal server error'
        : validation
          ? 'Dữ liệu không hợp lệ'
          : typeof data.message === 'string' && data.message.trim()
            ? sanitizeText(data.message.trim())
            : `${serviceName} không thể xử lý yêu cầu`;

    return {
      statusCode: status,
      code: validation ? 'VALIDATION_ERROR' : safeCode(data.code, status),
      message,
      ...(validation ? { details: { fields } } : {}),
      ...(safeErrorId(data.errorId) ? { errorId: data.errorId } : {}),
    };
  }

  if (typeof data === 'string' && data.trim()) {
    return {
      statusCode: status,
      code: DEFAULT_CODE_BY_STATUS[status] ?? `HTTP_${status}`,
      message:
        status >= 500 ? 'Internal server error' : sanitizeText(data.trim()),
    };
  }

  return {
    statusCode: status,
    code: DEFAULT_CODE_BY_STATUS[status] ?? `HTTP_${status}`,
    message: `${serviceName} không thể xử lý yêu cầu`,
  };
}

export class UpstreamHttpException extends HttpException {
  readonly isUpstream = true;
  readonly originService: string;
  readonly errorId?: string;

  constructor(
    response: Record<string, unknown>,
    status: number,
    originService: string,
  ) {
    super(response, status);
    this.originService = originService;
    this.errorId = safeErrorId(response.errorId);
  }
}

export class UpstreamTransportException extends BadGatewayException {
  readonly originService: string;

  constructor(originService: string, cause: Error) {
    super(
      {
        statusCode: 502,
        code: 'UPSTREAM_UNAVAILABLE',
        message: `${originService} hiện không khả dụng`,
      },
      { cause },
    );
    this.originService = originService;
  }
}

export function throwUpstreamError(error: unknown, serviceName: string): never {
  if (isAxiosError(error) && error.response) {
    const { data, status } = error.response;
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new UpstreamTransportException(serviceName, error);
    }
    throw new UpstreamHttpException(
      createUpstreamErrorPayload(data, status, serviceName),
      status,
      serviceName,
    );
  }

  const cause =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown upstream error');
  throw new UpstreamTransportException(serviceName, cause);
}
