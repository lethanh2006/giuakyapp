import type { DestinationStream, Logger } from "pino";

export type LogFormat = "json" | "pretty";

export interface AppLoggerOptions {
  serviceName?: string;
  serviceVersion?: string;
  serviceInstanceId?: string;
  environment?: string;
  level?: string;
  format?: LogFormat;
  base?: Record<string, unknown>;
  destination?: DestinationStream;
  redactPaths?: string[];
  colorize?: boolean;
  prettyOptions?: Record<string, unknown>;
}

export declare const DEFAULT_REDACT_PATHS: readonly string[];
export declare function createAppLogger(options?: AppLoggerOptions): Logger;
export declare function resolveLogFormat(format?: string): LogFormat;
export declare function resolveLogLevel(level?: string): string;
export declare function flushLogger(logger?: {
  flush?: () => unknown;
}): Promise<boolean>;

export declare class PinoNestLogger {
  constructor(logger?: Logger, context?: string);
  logger: Logger;
  context?: string;
  setContext(context: string): void;
  log(message: unknown, ...optionalParams: unknown[]): void;
  error(message: unknown, ...optionalParams: unknown[]): void;
  warn(message: unknown, ...optionalParams: unknown[]): void;
  debug(message: unknown, ...optionalParams: unknown[]): void;
  verbose(message: unknown, ...optionalParams: unknown[]): void;
  fatal(message: unknown, ...optionalParams: unknown[]): void;
}

export interface ExceptionClassification {
  statusCode: number;
  code: string;
  expected: boolean;
  retryable: boolean;
  logLevel: string;
  safeMessage: string;
  validationFields: string[];
}

export interface ClassificationOverrides {
  statusCode?: number;
  code?: string;
  expected?: boolean;
  retryable?: boolean;
  logLevel?: string;
  safeMessage?: string;
}

export declare const DEFAULT_CODE_BY_STATUS: Readonly<Record<number, string>>;
export declare function createErrorId(): string;
export declare function classifyException(
  error: unknown,
  overrides?: ClassificationOverrides,
): ExceptionClassification;
export declare function exceptionFields(
  error: unknown,
  classification: ExceptionClassification,
  errorId: string,
): Record<string, unknown>;

export interface LogExceptionOptions {
  errorId?: string;
  message?: string;
  classification?: ClassificationOverrides;
}

export declare function logException(
  logger: Logger,
  eventName: string,
  error: unknown,
  eventContext?: Record<string, unknown>,
  options?: LogExceptionOptions,
): {
  errorId: string;
  classification: ExceptionClassification;
};

export interface HttpBoundaryContext {
  requestId?: string;
  method?: string;
  route?: string;
  eventName?: string;
}

export interface HttpBoundaryResult {
  statusCode: number;
  classification: ExceptionClassification;
  errorId?: string;
  body: Record<string, unknown>;
}

export declare function handleOriginHttpException(
  logger: Logger,
  exception: unknown,
  context?: HttpBoundaryContext,
): HttpBoundaryResult;
export declare function validationFieldsFromMessages(messages: unknown): string[];

export declare function getLogContext(): Record<string, unknown>;
export declare function getCorrelationFields(): Record<string, unknown>;
export declare function runWithLogContext<TArgs extends unknown[], TResult>(
  fields: Record<string, unknown>,
  callback: (...args: TArgs) => TResult,
  ...args: TArgs
): TResult;

export declare const REQUEST_ID_HEADER: "x-request-id";
export declare const CLIENT_REQUEST_ID_HEADER: "x-client-request-id";
export declare const SAFE_REQUEST_ID: RegExp;
export declare function isSafeRequestId(value: unknown): value is string;
export declare function createRequestCorrelation(
  incomingRequestId?: unknown,
  options?: { trustIncoming?: boolean; generate?: () => string },
): { requestId: string; clientRequestId?: string };
export declare function requestIdFromLogContext(
  fallback?: unknown,
): string | undefined;

export declare function normalizeRouteTemplate(route: string): string;

export declare const REDACTED: "[REDACTED]";
export declare function isSensitiveKey(key: string): boolean;
export declare function sanitizeText<T>(value: T): T;
export declare function sanitizeValue(value: unknown): unknown;
